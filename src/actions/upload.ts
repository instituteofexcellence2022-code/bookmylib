'use server'

import { UTApi } from "uploadthing/server";
import { getAuthenticatedOwner } from "@/lib/auth/owner";
import { getAuthenticatedStaff } from "@/lib/auth/staff";
import { getAuthenticatedStudent } from "@/lib/auth/student";

const utapi = new UTApi();

export async function uploadFile(file: File) {
  // Check Authentication
  const owner = await getAuthenticatedOwner();
  const staff = await getAuthenticatedStaff();
  const student = await getAuthenticatedStudent();

  if (!owner && !staff && !student) {
    throw new Error('Unauthorized: Login required to upload files');
  }

  // Check for either the new Token OR the legacy Secret+AppId
  const hasToken = !!process.env.UPLOADTHING_TOKEN;
  const hasLegacy = !!process.env.UPLOADTHING_SECRET && !!process.env.UPLOADTHING_APP_ID;
  
  console.log('UploadThing Credentials Check:', { hasToken, hasLegacy });

  if (!hasToken && !hasLegacy) {
    console.error('UploadThing Environment Check Failed: No valid credentials found.');
    throw new Error('Missing UploadThing environment variables (UPLOADTHING_TOKEN or UPLOADTHING_SECRET + UPLOADTHING_APP_ID)')
  }

  if (!file) {
    throw new Error('No file uploaded')
  }

  try {
    const response = await utapi.uploadFiles([file]);
    
    if (response[0]?.error) {
        throw new Error(response[0].error.message)
    }

    return response[0].data?.url || null
  } catch (error) {
    console.error('Upload error in uploadFile:', error)
    if (error instanceof Error) {
        console.error('Stack:', error.stack)
    }
    // Throw the actual error message to the client
    throw new Error(error instanceof Error ? error.message : 'Upload failed')
  }
}
