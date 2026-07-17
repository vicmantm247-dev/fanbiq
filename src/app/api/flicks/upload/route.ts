import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { db } from "@/db";
import { flicks } from "@/db/schema";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const session = await getValidatedSession();

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const video = formData.get('video') as File | null;
    const title = formData.get('title')?.toString() ?? '';
    const description = formData.get('description')?.toString() ?? '';
    const movieTitle = formData.get('movieTitle')?.toString() ?? '';
    const movieYear = formData.get('movieYear')?.toString() ?? '';
    const tmdbId = formData.get('tmdbId')?.toString() ?? '';
    const moviePosterUrl = formData.get('moviePosterUrl')?.toString() ?? '';
    const movieBackdropUrl = formData.get('movieBackdropUrl')?.toString() ?? '';
    const tagsRaw = formData.get('tags')?.toString() ?? '[]';

    if (!video) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    if (!title || !movieTitle) {
      return NextResponse.json(
        { error: "Title and movie title are required" },
        { status: 400 }
      );
    }

    if (!video.type.startsWith('video/')) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a video file." },
        { status: 400 }
      );
    }

    if (video.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 }
      );
    }

    const parsedTags = (() => {
      try {
        const parsed = JSON.parse(tagsRaw);
        return Array.isArray(parsed) ? parsed.map((tag) => tag.toString()) : [];
      } catch {
        return [];
      }
    })();

    const originalName = video.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filename = `${Date.now()}-${originalName}`;
    const buffer = Buffer.from(await video.arrayBuffer());

    const cloudinaryEnabled = Boolean(
      config.cloudinary.cloudName &&
      config.cloudinary.apiKey &&
      config.cloudinary.apiSecret
    );

    // If running on Vercel, require Cloudinary to be configured — avoid writing to ephemeral filesystem.
    if (process.env.VERCEL && !cloudinaryEnabled) {
      throw new Error('Cloudinary must be configured in production (VERCEL). Aborting upload to avoid writing to ephemeral filesystem.');
    }

    let videoUrl: string;
    if (cloudinaryEnabled) {
      const { cloudName, apiKey, apiSecret, uploadFolder } = config.cloudinary;
      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary configuration is missing');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const folder = uploadFolder?.replace(/^\/+/, '') || 'fanbiq/flicks';
      const publicId = `${folder}/${filename.replace(/\.[^.]+$/, '')}`;
      const signatureParams = {
        folder,
        public_id: publicId,
        timestamp: String(timestamp),
      };
      const signature = createHash('sha1')
        .update(Object.entries(signatureParams)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('&') + apiSecret)
        .digest('hex');

      const form = new FormData();
      form.append('file', new Blob([buffer], { type: video.type }), filename);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('folder', folder);
      form.append('public_id', publicId);
      form.append('resource_type', 'video');
      form.append('signature', signature);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
      const cloudinaryResponse = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: form,
      });

      if (!cloudinaryResponse.ok) {
        const details = await cloudinaryResponse.text();
        throw new Error(`Cloudinary upload failed: ${cloudinaryResponse.status} ${details}`);
      }

      const cloudinaryJson = await cloudinaryResponse.json();
      videoUrl = cloudinaryJson.secure_url || cloudinaryJson.url;
      if (!videoUrl) {
        throw new Error('Cloudinary upload returned no secure URL');
      }
    } else {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'flicks');
      const filepath = path.join(uploadsDir, filename);
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(filepath, buffer);
      videoUrl = `/uploads/flicks/${filename}`;
    }


    const uploaderName = session?.user?.Name || 'anonymous';

    const [saved] = await db.insert(flicks).values({
      videoPath: filename,
      videoUrl,
      movieTitle,
      movieYear: parseInt(movieYear, 10),
      tmdbId: tmdbId ? parseInt(tmdbId, 10) : null,
      movieBackdropUrl: movieBackdropUrl || '',
      uploader: uploaderName,
      caption: description || '',
      tags: parsedTags,
    }).returning();

    logger.info(`Video upload saved: ${title} by ${uploaderName}`);

    const responseFlick = {
      id: saved.id,
      videoPath: saved.videoPath,
      videoUrl: saved.videoUrl,
      movieTitle: saved.movieTitle,
      movieYear: saved.movieYear,
      tmdbId: saved.tmdbId,
      movieBackdropUrl: saved.movieBackdropUrl,
      uploader: saved.uploader,
      caption: saved.caption,
      tags: saved.tags,
      likes: saved.likes,
      comments: saved.comments,
      views: saved.views,
      createdAt: saved.createdAt && typeof (saved.createdAt as any).toISOString === 'function'
        ? (saved.createdAt as any).toISOString()
        : String(saved.createdAt),
    };

    return NextResponse.json(
      { success: true, flick: responseFlick },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Failed to upload video:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

