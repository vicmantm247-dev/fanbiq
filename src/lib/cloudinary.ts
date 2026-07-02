export function getCloudinaryVideoThumbnailUrl(videoUrl?: string, width = 1200): string | undefined {
  if (!videoUrl) return undefined;

  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return undefined;
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith('res.cloudinary.com')) {
    return undefined;
  }

  const uploadSegment = '/video/upload/';
  const uploadIndex = url.pathname.indexOf(uploadSegment);
  if (uploadIndex === -1) {
    return undefined;
  }

  const afterUpload = url.pathname.slice(uploadIndex + uploadSegment.length);
  const lastDot = afterUpload.lastIndexOf('.');
  if (lastDot === -1) {
    return undefined;
  }

  const publicIdWithoutExtension = afterUpload.slice(0, lastDot);
  return `${url.protocol}//${hostname}${url.pathname.slice(0, uploadIndex + uploadSegment.length)}so_0,c_thumb,g_auto,w_${width},f_auto,q_auto/${publicIdWithoutExtension}.jpg`;
}
