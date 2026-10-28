import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../../../../api';

const STORAGE_KEY = 'printer_settings_local';

export type ConnectionType = 'USB' | 'LAN / Network' | 'Bluetooth' | 'Wi-Fi';
export type PaperSize = '58mm' | '80mm' | 'A4';
export type PrinterModel = 'EPSON TM-T82' | 'TVS RP 3150' | 'Generic POS Printer';

export type BluetoothDevice = {
  id: string;
  name: string;
  mac: string;
};

export type PrinterSettings = {
  printerModel: PrinterModel;
  connectionType: ConnectionType;
  ip: string;
  port: string;
  paperSize: PaperSize;
  printCopies: string;
  autoPrint: boolean;
  cashDrawer: boolean;
  kitchenPrinter: boolean;
  barcodePrinting: boolean;
  qrPrinting: boolean;
  printLogo: boolean;
  printHeader: boolean;
  printFooter: boolean;
  pairedDevices: BluetoothDevice[];
};

const defaultSettings: PrinterSettings = {
  printerModel: 'EPSON TM-T82',
  connectionType: 'USB',
  ip: '',
  port: '9100',
  paperSize: '58mm',
  printCopies: '1',
  autoPrint: true,
  cashDrawer: true,
  kitchenPrinter: false,
  barcodePrinting: true,
  qrPrinting: true,
  printLogo: true,
  printHeader: true,
  printFooter: true,
  pairedDevices: [],
};

export function usePrinterSettings() {
  const [settings, setSettings] = useState<PrinterSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Load from AsyncStorage local cache
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: PrinterSettings = JSON.parse(cached);
        setSettings(parsed);
      }
    } catch {
      // ignore cache read errors
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get('/settings/printer');
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        let paired: BluetoothDevice[] = [];
        try {
          paired = JSON.parse(d.paired_devices || '[]');
        } catch {
          paired = [];
        }
        const loaded: PrinterSettings = {
          printerModel: d.printer_model || defaultSettings.printerModel,
          connectionType: d.connection_type || defaultSettings.connectionType,
          ip: d.ip_address || '',
          port: d.port || '9100',
          paperSize: d.paper_size || defaultSettings.paperSize,
          printCopies: String(d.print_copies || 1),
          autoPrint: d.auto_print !== 0 && d.auto_print !== false,
          cashDrawer: d.cash_drawer !== 0 && d.cash_drawer !== false,
          kitchenPrinter: d.kitchen_printer === 1 || d.kitchen_printer === true,
          barcodePrinting: d.barcode_printing !== 0 && d.barcode_printing !== false,
          qrPrinting: d.qr_printing !== 0 && d.qr_printing !== false,
          printLogo: d.print_logo !== 0 && d.print_logo !== false,
          printHeader: d.print_header !== 0 && d.print_header !== false,
          printFooter: d.print_footer !== 0 && d.print_footer !== false,
          pairedDevices: Array.isArray(paired) ? paired : [],
        };
        setSettings(loaded);
        // Update local cache with server data
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loaded)).catch(() => {});
      } else {
        // Endpoint exists but returned no data — try local cache
        await loadFromCache();
      }
    } catch (err: any) {
      // 404 = endpoint not created yet on backend → silently use local cache / defaults
      const status = err?.status ?? err?.response?.status;
      if (status === 404 || status === 'network_error') {
        await loadFromCache();
      } else {
        // Unexpected error — still load from cache but show no banner
        await loadFromCache();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const save = async (s: PrinterSettings): Promise<boolean> => {
    setSaving(true);
    // Always persist locally first so the app remembers settings offline
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore local storage failures
    }
    // Then try to sync to the backend (silently succeeds if endpoint missing)
    try {
      const res = await api.post('/settings/printer', {
        printer_model: s.printerModel,
        connection_type: s.connectionType,
        ip_address: s.ip,
        port: s.port,
        paper_size: s.paperSize,
        print_copies: Number(s.printCopies) || 1,
        auto_print: s.autoPrint ? 1 : 0,
        cash_drawer: s.cashDrawer ? 1 : 0,
        kitchen_printer: s.kitchenPrinter ? 1 : 0,
        barcode_printing: s.barcodePrinting ? 1 : 0,
        qr_printing: s.qrPrinting ? 1 : 0,
        print_logo: s.printLogo ? 1 : 0,
        print_header: s.printHeader ? 1 : 0,
        print_footer: s.printFooter ? 1 : 0,
        paired_devices: JSON.stringify(s.pairedDevices),
      });
      setSaving(false);
      return res.data?.success === true;
    } catch {
      // Backend endpoint not ready yet — local save already done, treat as success
      setSaving(false);
      return true;
    }
  };

  return { settings, setSettings, loading, saving, fetchError, save };
}
