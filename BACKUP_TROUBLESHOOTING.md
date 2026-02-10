# Troubleshooting Automatic Backups

If your automatic Google Cloud backup is not working, follow these steps to identify and fix the issue.

## 1. Check GitHub Actions Logs
1. Go to your GitHub Repository.
2. Click on the **Actions** tab.
3. Look for the workflow named **Database Backup to Google Cloud Storage**.
4. Click on the failed run (red x) or the latest run.
5. Expand the **Backup NeonDB to GCS** job.
6. Look for the step that failed (red x).

### Common Error Messages & Solutions

| Error Step | Likely Cause | Solution |
|------------|--------------|----------|
| **Authenticate to Google Cloud** | Invalid JSON Key | Ensure `GCP_SA_KEY` in GitHub Secrets contains the **entire** JSON content of your service account key file (starts with `{` and ends with `}`). |
| **Upload to Google Cloud Storage** | Bucket Name Issue | Ensure `GCP_BACKUP_BUCKET` is just the name (e.g., `my-backup-bucket`), **NOT** `gs://my-backup-bucket`. |
| **Upload to Google Cloud Storage** | Permission Denied | Your Service Account needs the **Storage Object Admin** role on the bucket. |
| **Create Database Dump** | Connection Failed | Check if `DATABASE_URL` is correct in GitHub Secrets. It should match your Neon connection string. |

## 2. Verify GitHub Secrets
Go to **Settings** > **Secrets and variables** > **Actions** in your repository.
Ensure you have exactly these three secrets:

1.  `GCP_SA_KEY`: The full content of your Service Account JSON key.
2.  `GCP_BACKUP_BUCKET`: The name of your bucket (e.g., `library-backup-2024`).
3.  `DATABASE_URL`: Your full Postgres connection string.

## 3. Manually Trigger the Backup
You don't have to wait for midnight to test.
1. Go to **Actions** > **Database Backup to Google Cloud Storage**.
2. Click **Run workflow** (blue button on the right).
3. Select the `main` branch and click **Run workflow**.
4. Watch the run in real-time to see if it succeeds.

## 4. Local Test (Optional)
If you have the `gcloud` CLI installed locally, you can try to upload a file manually to verify permissions:
```bash
# Login with your service account key
gcloud auth activate-service-account --key-file=path/to/key.json

# Try to upload a test file
touch test.txt
gcloud storage cp test.txt gs://YOUR_BUCKET_NAME/
```
