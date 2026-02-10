# How to Get a Slack Webhook URL

To receive notifications when your database backup fails, you need to create a "Webhook" in Slack. Here is the step-by-step guide:

## Step 1: Create a Slack App
1. Go to the [Slack API: Your Apps](https://api.slack.com/apps) page.
2. Click **Create New App**.
3. Select **From scratch**.
4. **App Name**: Enter `Backup Bot` (or anything you like).
5. **Pick a workspace**: Select the Slack workspace where you want the notifications.
6. Click **Create App**.

## Step 2: Enable Incoming Webhooks
1. In the left sidebar, under **Features**, click **Incoming Webhooks**.
2. Switch the toggle **Activate Incoming Webhooks** to **On**.

## Step 3: Create the Webhook
1. Scroll down to the bottom of the page and click **Add New Webhook to Workspace**.
2. Slack will ask for permission. Select the **Channel** where you want the alerts to appear (e.g., `#general`, `#dev-alerts`, or a private channel).
3. Click **Allow**.

## Step 4: Copy the URL
1. You will be redirected back to the app settings.
2. Look for the **Webhook URL** in the table (it starts with `https://hooks.slack.com/services/...`).
3. Click **Copy**.

## Step 5: Add to GitHub Secrets
1. Go to your GitHub Repository.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. **Name**: `SLACK_WEBHOOK_URL`
5. **Value**: Paste the URL you just copied.
6. Click **Add secret**.

✅ **Done!** Next time a backup fails, you will get a message in that Slack channel.
