# Visual asset policy

The parametric core owns dimensions. 3D assets are visual skins only and must never drive BOM, cut-list, clearances or cut-outs.

## Preferred bundled source

Kenney assets are preferred for bundled third-party visuals because the asset pages state Creative Commons CC0. Keep the downloaded license file and source URL beside any redistributed model.

Candidate: Kenney Furniture Kit — https://kenney.nl/assets/furniture-kit

## Quaternius

Some individual historical pack pages still display CC0, while Quaternius' general asset license was updated in 2026. Do not assume all new downloads are CC0 from an old pack page alone. Archive the exact license shipped with the downloaded pack before committing any Quaternius files.

## Performance budget

- GLB / glTF preferred at runtime.
- One appliance skin target: <= 300kB compressed when practical.
- Shared textures, <= 1024px on mobile by default.
- Draco / Meshopt allowed later.
- Always provide procedural fallback geometry.
