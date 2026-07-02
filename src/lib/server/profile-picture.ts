import sharp from "sharp";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";
import { createHash } from "node:crypto";

function getCloudinaryPublicId(userId: string) {
    const folder = config.cloudinary.uploadFolder?.replace(/^\/+/, '') || 'fanbiq/profile';
    return `${folder}/${userId}`;
}

function buildCloudinarySignature(values: Record<string, string>) {
    const payload = Object.entries(values)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    return createHash('sha1').update(payload + config.cloudinary.apiSecret).digest('hex');
}

export async function saveProfilePicture(userId: string, imageBuffer: Buffer, contentType: string) {
    // Process image: preserve original quality and orientation
    const processedImage = await sharp(imageBuffer)
        .rotate()
        .toBuffer();

    const updatedAt = new Date();
    const cloudinaryEnabled = Boolean(
        config.cloudinary.cloudName &&
        config.cloudinary.apiKey &&
        config.cloudinary.apiSecret
    );

    let imageValue: string = processedImage.toString('base64');

    if (cloudinaryEnabled) {
        const { cloudName, apiKey, apiSecret } = config.cloudinary;
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary configuration is missing');
        }

        const timestamp = String(Math.floor(Date.now() / 1000));
        const publicId = getCloudinaryPublicId(userId);
        const signature = buildCloudinarySignature({
            folder: publicId.substring(0, publicId.lastIndexOf('/')),
            public_id: publicId,
            timestamp,
            overwrite: 'true',
        });

        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(processedImage)], { type: 'image/webp' }), `${userId}.webp`);
        form.append('api_key', apiKey);
        form.append('timestamp', timestamp);
        form.append('folder', publicId.substring(0, publicId.lastIndexOf('/')));
        form.append('public_id', publicId);
        form.append('overwrite', 'true');
        form.append('resource_type', 'image');
        form.append('signature', signature);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: form,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloudinary profile upload failed: ${response.status} ${errorText}`);
        }

        const json = await response.json();
        imageValue = json.secure_url || json.url;
        if (!imageValue) {
            throw new Error('Cloudinary returned no secure URL for profile picture');
        }
    }

    await db.insert(userProfiles)
        .values({
            userId,
            image: imageValue,
            contentType: 'image/webp',
            updatedAt,
        })
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: {
                image: imageValue,
                contentType: 'image/webp',
                updatedAt,
            }
        });

    return { success: true };
}

export async function getProfilePicture(userId: string) {
    const profile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, userId),
    });

    return profile;
}

export async function deleteProfilePicture(userId: string) {
    const cloudinaryEnabled = Boolean(
        config.cloudinary.cloudName &&
        config.cloudinary.apiKey &&
        config.cloudinary.apiSecret
    );

    if (cloudinaryEnabled) {
        const { cloudName, apiKey } = config.cloudinary;
        if (!cloudName || !apiKey) {
            throw new Error('Cloudinary configuration is missing');
        }

        const publicId = getCloudinaryPublicId(userId);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = buildCloudinarySignature({
            public_id: publicId,
            timestamp,
        });

        const form = new FormData();
        form.append('api_key', apiKey);
        form.append('timestamp', timestamp);
        form.append('public_id', publicId);
        form.append('signature', signature);

        const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
        await fetch(destroyUrl, {
            method: 'POST',
            body: form,
        });
    }

    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    return { success: true };
}
