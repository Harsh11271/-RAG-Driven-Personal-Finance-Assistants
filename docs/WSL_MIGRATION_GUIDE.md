# WSL Migration Guide: Finance Assistant

This guide outlines the steps to move your project from native Windows to **WSL (Ubuntu)** for better performance and native **Pathway** support.

---

## 🛠️ Step 1: Prepare WSL Environment

### 1.1 Enable Docker WSL Integration
1. Open **Docker Desktop** on Windows.
2. Go to **Settings** (gear icon) -> **Resources** -> **WSL Integration**.
3. Toggle the switch for **Ubuntu** to **On**.
4. Click **Apply & Restart**.

### 1.2 Install Required Tools in Ubuntu
Open your Ubuntu terminal and run:
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv nodejs npm git
```
*Note: It is recommended to use `nvm` for Node.js management in the future.*

---

## 🏗️ Step 2: Move Project to WSL Filesystem
Running Linux projects from the Windows mount (`/mnt/d/...`) is significantly slower. We recommend moving the files into your WSL home directory.

1. Create a project directory in WSL:
   ```bash
   mkdir -p ~/projects
   ```
2. Copy the project from Windows:
   ```bash
   # Replace the path with your actual Windows path if different
   cp -r "/mnt/d/Green/New folder/ai_clude/finance-assistant" ~/projects/
   ```
3. Navigate to the new location:
   ```bash
   cd ~/projects/finance-assistant
   ```

---

## 🚀 Step 3: Setup & Run (WSL Mode)

### 3.1 Setup Pathway Natively (Optional but Recommended)
Since Pathway works best on Linux, you can now run it without Docker if you prefer.
```bash
cd services/pathway-processor
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 3.2 Run Infrastructure via Docker
From your project root in WSL:
```bash
docker-compose up -d postgres mongo
```
*Note: Kafka and Zookeeper have been replaced by CSV connectors for simplicity and speed.*

### 3.3 Start Backend Services
In separate WSL terminals (or using `tmux`/`screen`):
```bash
# Example for Auth Service
cd services/auth-service
npm install
npm start
```

---

## 🔍 Why move to WSL?
1. **Pathway Performance**: Pathway is optimized for Linux kernel features like fast I/O and low-latency networking.
2. **File System Speed**: Inside the WSL filesystem (`~/`), I/O operations are up to 10x faster than accessing Windows drives (`/mnt/d`).
3. **Compatibility**: Many libraries (like `pathway[xpack]`) have native dependencies that are easier to manage on Ubuntu.
