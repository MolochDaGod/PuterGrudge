# Puter.js API Quick Reference

**Version:** v2  
**Last Updated:** 2025-01-11

Complete function reference for the Puter.js SDK. All functions are accessible via the global `puter` object after loading `https://js.puter.com/v2/`.

---

## AI Functions (`puter.ai`)

| Function | Description | Example |
|----------|-------------|---------|
| `chat()` | Chat with AI models | `puter.ai.chat("What is AI?", {model: "gpt-4"})` |
| `listModels()` | Get available models | `puter.ai.listModels()` |
| `listModelProviders()` | Get AI providers | `puter.ai.listModelProviders()` |
| `txt2img()` | Generate images from text | `puter.ai.txt2img("A sunset")` |
| `txt2speech()` | Convert text to audio | `puter.ai.txt2speech("Hello")` |
| `txt2vid()` | Generate videos from text | `puter.ai.txt2vid("Flying spaceship")` |
| `img2txt()` | OCR - Extract text from images | `puter.ai.img2txt(imageFile)` |
| `speech2txt()` | Transcribe audio | `puter.ai.speech2txt(audioBlob)` |
| `speech2speech()` | Voice translation | `puter.ai.speech2speech(audio, "Spanish")` |

---

## Apps Functions (`puter.app`)

| Function | Description | Example |
|----------|-------------|---------|
| `create()` | Create new app | `puter.app.create({name: "MyApp", code: "..."})` |
| `list()` | List all apps | `puter.app.list()` |
| `delete()` | Delete an app | `puter.app.delete("app-id")` |
| `update()` | Update app | `puter.app.update("app-id", {code: "..."})` |
| `get()` | Get app info | `puter.app.get("app-id")` |

---

## Auth Functions (`puter.auth`)

| Function | Description | Example |
|----------|-------------|---------|
| `signIn()` | Authenticate user | `puter.auth.signIn()` |
| `signOut()` | Logout user | `puter.auth.signOut()` |
| `isSignedIn()` | Check login status | `puter.auth.isSignedIn()` |
| `getUser()` | Get user info | `puter.auth.getUser()` |
| `getMonthlyUsage()` | Get API usage | `puter.auth.getMonthlyUsage()` |
| `getDetailedAppUsage()` | Get per-app stats | `puter.auth.getDetailedAppUsage()` |

---

## Cloud Storage Functions (`puter.fs`)

| Function | Description | Example |
|----------|-------------|---------|
| `write()` | Create/overwrite file | `puter.fs.write("file.txt", "content")` |
| `read()` | Read file contents | `puter.fs.read("file.txt")` |
| `mkdir()` | Create directory | `puter.fs.mkdir("projects")` |
| `readdir()` | List directory | `puter.fs.readdir("folder")` |
| `rename()` | Rename file/folder | `puter.fs.rename("old.txt", "new.txt")` |
| `copy()` | Copy file/folder | `puter.fs.copy("source", "dest")` |
| `move()` | Move file/folder | `puter.fs.move("source", "dest")` |
| `stat()` | Get file metadata | `puter.fs.stat("file.txt")` |
| `delete()` | Delete file/folder | `puter.fs.delete("file.txt")` |
| `getReadURL()` | Get shareable link | `puter.fs.getReadURL("file.txt")` |
| `upload()` | Upload from user | `puter.fs.upload()` |

---

## Serverless Workers (`puter.worker`)

| Function | Description | Example |
|----------|-------------|---------|
| `router` | Define API routes | `puter.worker.router.post("/api", handler)` |
| `create()` | Deploy new worker | `puter.worker.create({code: "..."})` |
| `delete()` | Delete worker | `puter.worker.delete("worker-id")` |
| `list()` | List all workers | `puter.worker.list()` |
| `get()` | Get worker details | `puter.worker.get("worker-id")` |
| `exec()` | Execute worker | `puter.worker.exec("worker-id", {data})` |

---

## Hosting Functions (`puter.hosting`)

| Function | Description | Example |
|----------|-------------|---------|
| `create()` | Host static website | `puter.hosting.create("mysite", "folder")` |
| `list()` | List hosted sites | `puter.hosting.list()` |
| `delete()` | Remove hosted site | `puter.hosting.delete("subdomain")` |
| `update()` | Update hosted site | `puter.hosting.update("subdomain", "folder")` |
| `get()` | Get hosting info | `puter.hosting.get("subdomain")` |

---

## Key-Value Store (`puter.kv`)

| Function | Description | Example |
|----------|-------------|---------|
| `set()` | Store key-value | `puter.kv.set("theme", "dark")` |
| `get()` | Retrieve value | `puter.kv.get("theme")` |
| `incr()` | Increment number | `puter.kv.incr("page_views")` |
| `decr()` | Decrement number | `puter.kv.decr("credits")` |
| `del()` | Delete key | `puter.kv.del("session")` |
| `list()` | List all keys | `puter.kv.list()` |
| `flush()` | Clear all data | `puter.kv.flush()` |
| `expire()` | Set expiration (seconds) | `puter.kv.expire("session", 3600)` |
| `expireAt()` | Set expiration (timestamp) | `puter.kv.expireAt("session", ts)` |

**Limits:**
- `MAX_KEY_SIZE`: 16 KB
- `MAX_VALUE_SIZE`: 512 MB

---

## Networking Functions

| Function | Description | Example |
|----------|-------------|---------|
| `Socket` | WebSocket connection | `new puter.Socket()` |
| `TLSSocket` | Secure WebSocket | `new puter.TLSSocket()` |
| `fetch()` | HTTP requests | `puter.net.fetch(url)` |

---

## UI Functions (`puter.ui`)

| Function | Description | Example |
|----------|-------------|---------|
| `authenticateWithPuter()` | Auth with Puter | `puter.ui.authenticateWithPuter()` |
| `alert()` | Show alert | `puter.ui.alert("Error!")` |
| `prompt()` | Input dialog | `puter.ui.prompt("Name?")` |
| `contextMenu()` | Right-click menu | `puter.ui.contextMenu([...])` |
| `createWindow()` | Create window | `puter.ui.createWindow({title: "New"})` |
| `exit()` | Close app | `puter.ui.exit()` |
| `getLanguage()` | Get system language | `puter.ui.getLanguage()` |
| `hideWindow()` | Hide window | `puter.ui.hideWindow()` |
| `showWindow()` | Show window | `puter.ui.showWindow()` |
| `launchApp()` | Launch app | `puter.ui.launchApp("appname")` |
| `setWindowTitle()` | Set title | `puter.ui.setWindowTitle("Title")` |
| `setWindowSize()` | Set dimensions | `puter.ui.setWindowSize(800, 600)` |
| `showColorPicker()` | Color picker | `puter.ui.showColorPicker()` |
| `showFontPicker()` | Font picker | `puter.ui.showFontPicker()` |
| `showOpenFilePicker()` | Open file dialog | `puter.ui.showOpenFilePicker()` |
| `showSaveFilePicker()` | Save file dialog | `puter.ui.showSaveFilePicker()` |
| `showDirectoryPicker()` | Folder picker | `puter.ui.showDirectoryPicker()` |
| `socialShare()` | Share on social | `puter.ui.socialShare("Check this!")` |
| `setMenubar()` | Set app menu | `puter.ui.setMenubar([...])` |

---

## Permissions Functions (`puter.perm`)

| Function | Description |
|----------|-------------|
| `request()` | Request generic permission |
| `requestEmail()` | Request email access |
| `requestReadDesktop()` | Read desktop access |
| `requestWriteDesktop()` | Write desktop access |
| `requestReadDocuments()` | Read documents access |
| `requestWriteDocuments()` | Write documents access |
| `requestReadPictures()` | Read pictures access |
| `requestWritePictures()` | Write pictures access |
| `requestReadVideos()` | Read videos access |
| `requestWriteVideos()` | Write videos access |
| `requestReadApps()` | Read apps access |
| `requestManageApps()` | Manage apps access |
| `requestReadSubdomains()` | Read subdomains |
| `requestManageSubdomains()` | Manage subdomains |

---

## Utility Functions (`puter.util`)

| Property/Function | Description | Example |
|-------------------|-------------|---------|
| `appID` | Get app ID | `puter.util.appID` |
| `env` | Environment vars | `puter.util.env.API_KEY` |
| `print()` | Console output | `puter.util.print("Hello")` |
| `randName()` | Random name | `puter.util.randName()` |

---

## Quick Start Template

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://js.puter.com/v2/"></script>
</head>
<body>
  <script>
    (async () => {
      // Authenticate
      if (!await puter.auth.isSignedIn()) {
        await puter.auth.signIn();
      }
      
      // Get user
      const user = await puter.auth.getUser();
      console.log(`Hello, ${user.username}!`);
      
      // Use AI
      const response = await puter.ai.chat("Tell me a joke");
      puter.print(response);
      
      // Save to cloud
      await puter.fs.write("joke.txt", response);
      
      // Store preference
      await puter.kv.set("last_joke", response);
    })();
  </script>
</body>
</html>
```

---

**CloudPilot AI Studio** - Powered by Puter.js
