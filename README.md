# Aioli Overlay

A customizable web-based overlay tracker designed for streaming with TikTok Live Studio. Features a transparent background and real-time counter updates from text files. Perfect for tracking lives, deaths, levels, shiny hunts, or anything else you want to track.

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Sections**

   Create a `config.json` file to define your custom sections:
   ```json
   {
     "sections": [
       {
         "title": "Current Hunt",
         "image": "img/character.png",
         "counter1": "txt/counter.txt",
         "counter2": null,
         "separator": null
       },
       {
         "title": "Progress",
         "image": null,
         "counter1": "txt/current.txt",
         "counter2": 100,
         "separator": "/"
       }
     ]
   }
   ```

3. **Configure Hosts File**

   Add the following to your hosts file:
   ```text
   127.0.0.1 aioli.local
   ```
   This will allow you to access the overlay at `http://aioli.local` from your browser, as TikTok Live Studio requires a "valid" URL.

4. **Start the Server**

   ```bash
   npm start
   ```

5. **Add to TikTok Live Studio**

   - Open TikTok Live Studio
   - Add a new source
   - Choose "Link" as the source type
   - Enter: `http://aioli.local`
   - The overlay will appear with a transparent background

## Usage

- Each section supports a title, subtitle, image, and up to two counters
- All sections are optional, so you can have as many or as few as you want (but you obviously need at least one)
- Counters update automatically every second by reading from your text files
- Images update automatically every 5 seconds
- If a section has two counters, you can specify a custom separator (e.g., "/", "-", "of")
- Counter2 can be either a file path (for dynamic values) or a number (for static totals)
- Sections are displayed in the order they appear in your config.json

## File Structure

```
aioli-overlay/
├── package.json          # Dependencies and scripts
├── server.js             # Express server
├── index.html            # Main HTML page
├── style.css             # Styling
├── script.js             # Client-side JavaScript
├── config.json           # Configuration file
├── img/                  # Image files folder
└── txt/                  # Counter text files folder
```

### User Instructions for Executable

1. Download and place `aioli-overlay.exe` in a folder
2. Double-click to run (may prompt for admin to edit hosts file)
3. A `config.json` template will be created if missing
4. Create `img/` and `txt/` folders next to the executable
5. Add your images to `img/` folder
6. Add your counter files to `txt/` folder (e.g., `counter.txt`, `lives.txt`)
7. Edit `config.json` to configure your sections (paths can be relative to the executable)
8. Run the executable again
9. Open TikTok Live Studio and add `http://aioli.local` as a link source

## Troubleshooting

- Make sure the counter file exists and contains only a number
- Ensure image files exist at the specified paths
- Check that port 80 is not being used by another application
- Verify file paths in `config.json` are correct (use absolute paths if needed)
- Verify the domain is correct in your hosts file
- Stop and restart the server (currently, if you change any paths in the config.json file, you need to stop and restart the server for the changes to take effect)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.