import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { COOKIE_KEYS } from "@/lib/auth/session";
 
const f = createUploadthing();
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "8MB" }, pdf: { maxFileSize: "8MB" } })
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const cookieStore = await cookies();
      const ownerSession = cookieStore.get(COOKIE_KEYS.OWNER);
      const staffSession = cookieStore.get(COOKIE_KEYS.STAFF);
      const studentSession = cookieStore.get(COOKIE_KEYS.STUDENT);

      // Check if user is authenticated (Owner, Staff, or Student)
      const userId = ownerSession?.value || staffSession?.value || studentSession?.value;

      if (!userId) {
        throw new UploadThingError("Unauthorized");
      }

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;