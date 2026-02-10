# Database Backup Setup Guide

Follow these steps to configure the automated daily backups to Google Cloud Storage.

## Phase 1: Google Cloud Setup (Web Console)

1.  **Create a Project**
    *   Go to [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project (e.g., `bookmylib-backup`).

2.  **Create a Storage Bucket**
    *   Navigate to **Cloud Storage** > **Buckets**.
    *   Click **Create**.
    *   Name it (e.g., `bookmylib-backup-prod`). **Remember this name.**
    *   Region: Choose `asia-south2 (Delhi)` (since you are in India).
    *   **Storage Class**: Choose **Nearline** (Best for backups/data accessed < 1 month).
    *   **Access Control**: Ensure "Enforce public access prevention" is **checked** and Access Control is **Uniform**.
    *   **Protection**: Leave defaults (Soft delete: Default, Versioning: Disabled).
    *   Click **Create**.

3.  **Configure Lifecycle Rules (Crucial for Cost Saving)**
    *   After creating the bucket, click on the **Lifecycle** tab (top menu of the bucket details).
    *   **Rule 1: Move old backups to cheap storage**
        *   Click **ADD A RULE**.
        *   **Select an action**: Choose **Set storage class to Archive**. click Continue.
        *   **Select object conditions**: Check **Age** and enter **30**.
        *   Click **CREATE**.
    *   **Rule 2: Delete very old backups**
        *   Click **ADD A RULE** again.
        *   **Select an action**: Choose **Delete object**. click Continue.
        *   **Select object conditions**: Check **Age** and enter **365**.
        *   Click **CREATE**.

4.  **Create a Service Account**
    *   Navigate to **IAM & Admin** > **Service Accounts**.
    *   Click **Create Service Account**.
    *   Name: `github-actions-backup`.
    *   Click **Create and Continue**.

4.  **Assign Permissions**
    *   Role 1: **Storage Object Admin** (Full control over objects).
    *   Click **Done**.

5.  **Generate Key**
    *   Click on the newly created service account email.
    *   Go to the **Keys** tab.
    *   Click **Add Key** > **Create new key**.
    *   Type: **JSON**.
    *   Click **Create**. A file will download to your computer.

## Phase 2: GitHub Repository Setup

1.  **Open Repository Settings**
    *   Go to your GitHub repository.
    *   Click **Settings** > **Secrets and variables** > **Actions**.

2.  **Add Secrets**
    Click **New repository secret** for each of the following:

    | Name | Value |
    |------|-------|
    | `GCP_SA_KEY` | Open the JSON file you downloaded in Step 5. Copy the **entire content** and paste it here. |
    | `GCP_BACKUP_BUCKET` | The name of the bucket you created (e.g., `bookmylib-backup-prod`). |
    | `DATABASE_URL` | Your Neon database connection string (likely already exists). |

## Phase 3: Verification

1.  Go to the **Actions** tab in your GitHub repository.
2.  Select **Database Backup to Google Cloud Storage** on the left.
3.  Click **Run workflow** > **Run workflow**.
4.  Wait for it to complete (green checkmark).
5.  Check your Google Cloud Bucket to see the `.dump` file.
