import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NetworkIcon, WifiIcon } from '../components/PrinterIcons';
import { PrinterInput } from '../components/PrinterInput';
import type { ConnectionType } from '../hooks/usePrinterSettings';

type NetworkPanelProps = {
  type: ConnectionType;
  ip: string;
  port: string;
  onChangeIp: (text: string) => void;
  onChangePort: (text: string) => void;
};

export function NetworkPanel({ type, ip, port, onChangeIp, onChangePort }: NetworkPanelProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');

  const handleTest = () => {
    if (!ip.trim()) return;
    setTestStatus('testing');
    // Simulate a connection test
    setTimeout(() => {
      setTestStatus(ip.startsWith('192.168') || ip.startsWith('10.') ? 'success' : 'fail');
    }, 1800);
  };

  const isWifi = type === 'Wi-Fi';

  return (
    <View className="mt-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <View className="mb-4 flex-row items-center gap-2">
        {isWifi ? <WifiIcon size={18} color="#0F172A" /> : <NetworkIcon size={18} color="#0F172A" />}
        <Text className="font-bold text-[#0F172A]">Network Configuration</Text>
      </View>

      <PrinterInput
        label="Printer IP Address"
        placeholder="192.168.1.100"
        value={ip}
        onChangeText={onChangeIp}
        keyboardType="numbers-and-punctuation"
      />
      <PrinterInput
        label="Port"
        placeholder="9100"
        value={port}
        onChangeText={onChangePort}
        keyboardType="number-pad"
      />

      <Pressable
        onPress={handleTest}
        disabled={testStatus === 'testing' || !ip.trim()}
        className="mt-1 self-start rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2"
        style={({ pressed }) => ({ opacity: pressed || !ip.trim() ? 0.6 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Test connection"
      >
        <Text className="text-sm font-semibold text-[#2563EB]">
          {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </Text>
      </Pressable>

      {testStatus === 'success' && (
        <View className="mt-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2">
          <Text className="text-[13px] font-semibold text-[#065F46]">✓ Printer reachable at {ip}:{port}</Text>
        </View>
      )}
      {testStatus === 'fail' && (
        <View className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2">
          <Text className="text-[13px] font-semibold text-[#991B1B]">✗ Could not reach printer. Check IP and ensure same network.</Text>
        </View>
      )}
    </View>
  );
}
