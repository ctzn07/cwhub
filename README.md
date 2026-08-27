# CWHub

CWHub is an Electron wrapper for the Corsair Web Hub that provides compatible browser environment and manages necessary device permissions automatically.

## Downloads

Latest release: 
[1.0](https://github.com/ctzn07/cwhub/releases/download/1.0.0/CWHub.AppImage)

sha256sum:
```sh
049f08f3249dd54857e9cb3be28d47c14cdf613e62abf040c0e9975711d96e89
```

## Installation

CWHub does not require any installation, just run it
(chmod may be required depending on your distro)
```bash
chmod +x CWHub.AppImage
```
or Right-click -> Properties -> Permissions -> check "Allow executing file as program"

## For development

```bash
# Clone repository
git clone https://github.com/ctzn07/cwhub.git
cd cwhub

# Install dependencies
npm install

# Run
npm run dev

# Build
npm run build
```

## License

MIT