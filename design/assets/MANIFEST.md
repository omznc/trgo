# Asset manifest

All 5 uploaded assets are MISSING from disk. The MCP tool `read_asset` refuses them: the artifact was made from an artifact type, so only text assets are readable. The URLs `/_blob/<id>` load only inside the artifact page (needs login). Download them by hand from the canvas and save them under the names below.

| Blob id | Type | Size (bytes) | Target file name | Status | Used in |
|---|---|---|---|---|---|
| 44d310d932b0fe647b478ab95165dc21 | image/png | 10715 | `ender3-v3-ke-main.png` | MISSING | Chat (user attachment 1, 72x72, object-fit cover); Detail (main image, alt "Creality Ender-3 V3 KE, glavna slika", 100% wide); SellPhotos (Slika 1, Slika 4); SellDraft (cover thumbnail); SellApprove (56x56 thumbs); MyListings, Settings (result card images); Phones |
| df4e2008cb50c49c6ac755a1a645c6be | image/png | 10098 | `ender3-pro.png` | MISSING | Detail (gallery); SellPhotos (Slika 3, Slika 4); SellApprove (56x56 thumb Slika 3); Settings; MyListings; Phones; Chat (result card "Ender 3 Pro") |
| f60fcfa9ea5a0a5d2889a1e0c901f068 | image/png | 9826 | `ender3-v3-se.png` | MISSING | Chat (result card and attachment 2); Detail; States (listing card, with grayscale filter for the sold/hidden state); Phones (alt "Ender-3 V3 SE"); SellPhotos (Slika 2, Slika 5); SellApprove; MyListings; Settings |
| 0d8c06583ba915d3650460a9d287bf0a | image/png | 20275 | `unused-0d8c.png` | MISSING, NOT REFERENCED by any artboard | none |
| c7026eb7a6b4d543f03f3ad6f8fe4d7d | image/png | 7977 | `unused-c702.png` | MISSING, NOT REFERENCED by any artboard | none |

Notes:
- The three used images are sample product photos (3D printers). They are demo data only. The app does not need them: it shows real listing images.
- The mascot, icons and the sun are inline SVG or CSS in the artboards. They need no asset files.
- sha256 values are in the artifact file list: 44d3... 43c24a17..., df4e... e6ceb08a..., f60f... c18ab65e..., 0d8c... 7176a1b7..., c702... 948d431c....
