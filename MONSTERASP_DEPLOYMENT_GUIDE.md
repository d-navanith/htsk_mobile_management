# MonsterASP.NET Deployment Guide for HTSK Mobile Management

This guide explains how to host the **HTSK Mobile Management System** on **MonsterASP.NET** (Windows Server / IIS environment) using the pre-packaged deployment bundle.

---

## 📦 What is in the Deployment Bundle?

We have prepared a self-contained, production-ready package:
- **`monsterasp_deploy.zip`** (located at `d:\htsk_mobile_2\monsterasp_deploy.zip`)
- **`publish_monsterasp/`** (extracted unzipped folder)

### Included in the package:
1. **`web.config`**: Configured with IIS **`HttpPlatformHandler`** to run Node.js on MonsterASP.NET.
2. **`server.js`**: Production backend server binding to MonsterASP.NET's dynamic `%HTTP_PLATFORM_PORT%`.
3. **`database.js`**: 3NF Relational database manager.
4. **`mobile_management.sqlite`**: Pre-seeded SQLite database in Third Normal Form.
5. **`dist/` & `client/dist/`**: Pre-compiled production build of the React frontend.
6. **`node_modules/`**: Complete set of production dependencies (no need to run `npm install` on the server).
7. **`logs/`**: Directory where IIS writes standard output and error logs (`logs/stdout_*.log`).
8. **`sample_mobile_upload.xlsx`**: Sample template for testing the Update section.

---

## 🚀 Step-by-Step Deployment (Method 1: Control Panel File Manager — Recommended)

### Step 1: Log in to MonsterASP.NET
1. Go to [https://cp.monsterasp.net/](https://cp.monsterasp.net/) and log in to your account.
2. From the left sidebar, click on **Websites**.
3. Click on your website (e.g. `yourdomain.monsterasp.net`).

### Step 2: Open File Manager
1. In your website dashboard menu, click on **File Manager**.
2. Click into the **`wwwroot`** folder (this is the root directory of your website).
3. If there are any default placeholder files (such as `hostingstart.html` or `default.aspx`), select them and click **Delete**.

### Step 3: Upload and Extract `monsterasp_deploy.zip`
1. Click **Upload File** in the File Manager toolbar.
2. Select **`monsterasp_deploy.zip`** from your computer (`d:\htsk_mobile_2\monsterasp_deploy.zip`).
3. Once the upload finishes:
   - Select `monsterasp_deploy.zip`.
   - Click the **Extract / Unzip** button.
   - Choose to extract directly into `/wwwroot`.
4. Verify that the files (`server.js`, `database.js`, `web.config`, `dist`, `node_modules`, `mobile_management.sqlite`) are located directly inside `/wwwroot`.
5. *(Optional)* Delete `monsterasp_deploy.zip` from `/wwwroot` to save storage space.

### Step 4: Restart and Verify
1. In the website dashboard, click the **Restart** button.
2. Open your website in a browser:
   `https://yourdomain.monsterasp.net`
3. Your **HTSK Mobile Management System** is live!

---

## 📡 Alternative Deployment (Method 2: FTP / FileZilla)

If you prefer uploading via FTP:
1. In MonsterASP.NET, go to **FTP Accounts** and get your:
   - **Host / Server IP**
   - **Username**
   - **Password**
2. Open **FileZilla** or your preferred FTP client.
3. Connect using the credentials.
4. Navigate to the remote directory: `/wwwroot`.
5. Upload all the files and folders from `d:\htsk_mobile_2\publish_monsterasp\` directly into `/wwwroot`.
6. Restart your website in the MonsterASP.NET control panel.

---

## ⚙️ How `web.config` Works on MonsterASP.NET

MonsterASP.NET uses Windows Server IIS with the **HttpPlatformHandler** module. The included `web.config` handles reverse proxying and process management automatically:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified" />
    </handlers>

    <httpPlatform processPath="node"
                  arguments=".\server.js"
                  startupTimeLimit="60"
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\logs\stdout">
      <environmentVariables>
        <!-- Dynamically passed by MonsterASP.NET IIS -->
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%" />
        <environmentVariable name="NODE_ENV" value="production" />
      </environmentVariables>
    </httpPlatform>

    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="20971520" /> <!-- 20MB upload limit -->
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

---

## 🔍 Troubleshooting & Logs

- **If you see HTTP 502.5 or 500 error:**
  - In File Manager, navigate to `/wwwroot/logs/`.
  - Open the generated `stdout_*.log` file to view the Node.js startup log.
- **Process Tab:**
  - In the MonsterASP.NET control panel, go to **Process** to see `node.exe` running. If stopped, click **Start / Restart**.
