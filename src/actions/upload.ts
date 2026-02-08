'use server'

import { UTApi } from "uploadthing/server";
import { getAuthenticatedOwner } from "@/lib/auth/owner";
import { getAuthenticatedStaff } from "@/lib/auth/staff";
import { getAuthenticatedStudent } from "@/lib/auth/student";

const utapi = new UTApi();

export async function uploadFile(file: File) {
  try {
    // Check Authentication
    const owner = await getAuthenticatedOwner();
    const staff = await getAuthenticatedStaff();
    const student = await getAuthenticatedStudent();

    if (!owner && !staff && !student) {
      return { success: false, error: 'Unauthorized: Login required to upload files' };
    }

    // Check for either the new Token OR the legacy Secret+AppId
    const hasToken = !!process.env.UPLOADTHING_TOKEN;
    const hasLegacy = !!process.env.UPLOADTHING_SECRET && !!process.env.UPLOADTHING_APP_ID;
    
    // console.log('UploadThing Credentials Check:', { hasToken, hasLegacy });

    if (!hasToken && !hasLegacy) {
      console.error('UploadThing Environment Check Failed: No valid credentials found.');
      return { success: false, error: 'Configuration error: Missing UploadThing credentials' };
    }

    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }

    const response = await utapi.uploadFiles([file]);
    
    if (response[0]?.error) {
        return { success: false, error: response[0].error.message };
    }

    return { success: true, data: response[0].data?.url || null };

  } catch (error) {
    console.error('Upload error in uploadFile:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}
