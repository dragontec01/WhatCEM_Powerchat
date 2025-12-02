# GitHub Actions Deployment Setup

This document explains how to set up automated deployments to your production server using GitHub Actions.

## Prerequisites

1. A server with SSH access
2. GitHub repository with Actions enabled
3. SSH key pair for authentication

## Setup Instructions

### 1. Generate SSH Key Pair (if you don't have one)

On your local machine or server, generate an SSH key pair:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key
```

### 2. Add Public Key to Server

Copy the public key to your server's authorized_keys:

```bash
# View the public key
cat ~/.ssh/github_deploy_key.pub

# Then on your server, add it to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Configure GitHub Secrets

Go to your GitHub repository:
- Navigate to **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret** and add the following secrets:

#### Required Secrets:

1. **SSH_PRIVATE_KEY**
   - Value: Content of your private key (`~/.ssh/github_deploy_key`)
   - Copy the entire key including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`
   
   ```bash
   cat ~/.ssh/github_deploy_key
   ```

2. **SSH_PASSPHRASE**
   - Value: The passphrase/password you used when generating the SSH key
   - This is the password you enter when you use the key
   - **Important**: If your key doesn't have a passphrase, you can skip adding this secret

3. **SSH_HOST**
   - Value: Your server's hostname or IP address
   - Example: `123.45.67.89` or `your_domain.com`

4. **SSH_USER**
   - Value: The SSH username for deployment
   - Example: `root` or `www-data` or your server username

### 4. Verify Server Setup

Make sure your server has the following:

1. **Node.js installed** (version 20.x or higher)
2. **Application directory exists**: `/www/wwwroot/your_domain.com`
3. **manage.sh script** is executable:
   ```bash
   chmod +x /www/wwwroot/your_domain.com/instances/your_domain/manage.sh
   ```

### 5. Test SSH Connection

Before deploying, test that SSH works:

```bash
ssh -i ~/.ssh/github_deploy_key YOUR_SSH_USER@YOUR_SSH_HOST "echo 'SSH connection successful!'"
```

## How to Deploy

### Option 1: Manual Deployment via GitHub UI

1. Go to your repository on GitHub
2. Click on **Actions** tab
3. Select **Build and Deploy to Production** workflow
4. Click **Run workflow** button
5. Enter the branch name you want to deploy (e.g., `main`, `develop`, `production`)
6. Click **Run workflow**

### Option 2: Using GitHub CLI

```bash
# Install GitHub CLI if you haven't
# https://cli.github.com/

# Trigger deployment
gh workflow run deploy.yml -f branch=main
```

## Deployment Process

The workflow will:

1. ✅ Checkout the selected branch
2. ✅ Install Node.js dependencies
3. ✅ Build the project (`npm run build:production`)
4. ✅ Create a compressed archive of the `dist` folder
5. ✅ Upload to server via SCP
6. ✅ Backup existing `dist` folder (with timestamp)
7. ✅ Extract new `dist` folder
8. ✅ Stop the application (`./manage.sh stop`)
9. ✅ Start the application (`./manage.sh start`)
10. ✅ Show deployment status

## Monitoring Deployments

### View Deployment Logs

1. Go to **Actions** tab in your repository
2. Click on the latest workflow run
3. Expand the steps to see detailed logs

### Check Application Status

After deployment, you can SSH into your server and check:

```bash
cd /www/wwwroot/your_domain.com/instances/your_app
./manage.sh status
```

## Rollback Instructions

If a deployment fails, you can rollback to a previous version:

1. SSH into your server:
   ```bash
   ssh YOUR_SSH_USER@YOUR_SSH_HOST
   ```

2. Navigate to the application directory:
   ```bash
   cd /www/wwwroot/your_domain.com
   ```

3. List available backups:
   ```bash
   ls -la | grep dist.backup
   ```

4. Restore a backup:
   ```bash
   # Stop the application
   cd instances/your_app
   ./manage.sh stop
   
   # Go back to root directory
   cd /www/wwwroot/your_domain.com

   # Remove current dist
   rm -rf dist
   
   # Restore backup (replace timestamp with your backup)
   mv dist.backup.20251127_123456 dist
   
   # Start the application
   cd instances/your_app
   ./manage.sh start
   ```

## Troubleshooting

### SSH Connection Failed

- Verify SSH_HOST, SSH_USER, and SSH_PRIVATE_KEY secrets are correct
- Ensure the public key is added to `~/.ssh/authorized_keys` on the server
- Check firewall rules allow SSH connections from GitHub Actions IPs

### Build Failed

- Check if all dependencies are in `package.json`
- Ensure `build:production` script is defined in `package.json`
- Review build logs in GitHub Actions

### Deployment Script Failed

- Verify `/www/wwwroot/your_domain.com` directory exists
- Check `manage.sh` is executable and works correctly
- Ensure user has write permissions to the deployment directory

### Application Won't Start

- Check application logs on the server
- Verify environment variables are set correctly
- Ensure database connections are working
- Check Docker containers status if using Docker

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Rotate SSH keys** regularly
3. **Use least privilege** - deployment user should only have necessary permissions
4. **Monitor deployments** - review logs after each deployment
5. **Test in staging** - always test deployments in a staging environment first

## Additional Configuration

### Deploy to Multiple Environments

You can modify the workflow to support multiple environments (staging, production):

```yaml
on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch to deploy'
        required: true
        default: 'main'
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - production
          - staging
```

Then use different secrets for each environment:
- `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_PRIVATE_KEY`
- `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_PRIVATE_KEY`

## Support

If you encounter issues:
1. Check the GitHub Actions logs
2. Review server logs
3. Verify all secrets are correctly configured
4. Test SSH connection manually
