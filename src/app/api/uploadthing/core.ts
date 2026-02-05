import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getAuthenticatedOwner } from "@/lib/auth/owner";
import { getAuthenticatedStaff } from "@/lib/auth/staff";
import { getAuthenticatedStudent } from "@/lib/auth/student";
 
const f = createUploadthing();
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "8MB" }, pdf: { maxFileSize: "8MB" } })
    .middleware(async () => {
      // This code runs on your server before upload
      let userId: string | null = null;

      // Check Owner
      const owner = await getAuthenticatedOwner();
      if (owner) {
        userId = owner.id;
      }

      // Check Staff
      if (!userId) {
        const staff = await getAuthenticatedStaff();
        if (staff) {
          userId = staff.id;
        }
      }

      // Check Student
      if (!userId) {
        const student = await getAuthenticatedStudent();
        if (student) {
          userId = student.id;
        }
      }

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