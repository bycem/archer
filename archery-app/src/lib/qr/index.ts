export interface QrScanner {
  scan(): Promise<string>;
}

/**
 * Web implementation using html5-qrcode.
 * On native (Capacitor), swap this for @capacitor-community/barcode-scanner.
 */
class WebQrScanner implements QrScanner {
  async scan(): Promise<string> {
    throw new Error('Camera QR scan not yet implemented for web; use file upload or manual entry.');
  }
}

export const qrScanner: QrScanner = new WebQrScanner();
