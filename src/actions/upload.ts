'use server'

import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function uploadFile(file: File) {
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
    console.error('Upload error:', error)
    throw new Error('Upload failed')
  }
}
