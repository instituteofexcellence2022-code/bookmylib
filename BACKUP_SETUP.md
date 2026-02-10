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

4.  **Create Service Account & Get Key (The "Login" for GitHub)**
    *   In the Google Cloud Console search bar (top), type **"Service Accounts"** and select it (under IAM & Admin).
    *   Click **+ CREATE SERVICE ACCOUNT** (top button).
    *   **Step 1: Service account details**
        *   **Service account name**: `github-actions-backup`.
        *   Click **CREATE AND CONTINUE**.
    *   **Step 2: Grant this service account access to project**
        *   Click the **Select a role** dropdown.
        *   Type **"Storage Object Admin"** in the filter and select it. (This gives permission to upload files).
        *   Click **CONTINUE**.
    *   **Step 3: Grant users access...**
        *   Skip this (leave blank).
        *   Click **DONE**.

5.  **Generate the Key File**
    *   You will now see a list of service accounts. Click on the **Email address** of the one you just created (`github-actions-backup@...`).
    *   Click on the **KEYS** tab (top menu row).
    *   Click **ADD KEY** > **Create new key**.
    *   Select **JSON** (default).
    *   Click **CREATE**.
    *   **IMPORTANT**: A file will download to your computer. **Keep this safe.** This is the "password" GitHub needs to upload backups.

## Phase 2: GitHub Repository Setup

1.  **Open Repository Settings**
    *   Go to your GitHub repository.
    *   Click **Settings** > **Secrets and variables** > **Actions**.

2.  **Add Secrets**
    Click **New repository secret** for each of the following:

    | Name | Value |
    |------|-------|
    | `GCP_SA_KEY` | **Open the JSON file** you downloaded in Step 5 with Notepad. Copy the **entire content** (starting with `{` and ending with `}`) and paste it here.<br><br>It should look like this:<br>`{"type": "service_account", "project_id": "...", ...}`<br><br>⚠️ **Do NOT paste just the ID.** |
    | `GCP_BACKUP_BUCKET` | The name of the bucket you created (e.g., `bookmylib-backup-prod`). |
    | `DATABASE_URL` | Your Neon database connection string (likely already exists). |

## Phase 3: Verification

1.  Go to the **Actions** tab in your GitHub repository.
2.  Select **Database Backup to Google Cloud Storage** on the left.
3.  Click **Run workflow** > **Run workflow**.
4.  Wait for it to complete (green checkmark).
5.  Check your Google Cloud Bucket to see the `.dump` file.

## Phase 4: How to Restore (Emergency Only)

If you ever need to restore your database from a backup:

1.  **Download the backup file** (`.dump`) from your Google Cloud Bucket.
2.  **Install PostgreSQL tools** (if you haven't already) to get the `pg_restore` command.
3.  **Run the restore command** in your terminal:

```bash
# WARNING: This will overwrite data. Be careful.
pg_restore -d "YOUR_DATABASE_URL" --clean --if-exists --no-owner --no-privileges backup_file_name.dump
```

## Phase 5: Enhanced Safety Features (Automatically Active)

The backup workflow now includes these safety checks automatically:
1.  **Compression:** Uses level 5 compression to save space and transfer time.
2.  **Integrity Check:** Runs `pg_restore --list` on every backup *before* upload. If a backup is corrupt or empty, the workflow will fail (and notify you) instead of uploading a broken file.
3.  **LATEST Pointer:** It uploads a file named `LATEST` to your bucket which always contains the path to the newest backup. This is useful if you ever write a script to auto-restore.
