import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { cn } from '@/utils/cn';

interface Stop {
  id: string;
  address: string;
  suburb: string;
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';
  sequence: number;
  coordinates: { lat: number; lng: number };
}

const mockStops: Stop[] = [
  { id: '1', address: '2/14 Riccarton Road', suburb: 'Riccarton', status: 'delivered', sequence: 1, coordinates: { lat: -43.535, lng: 172.605 } },
  { id: '2', address: '45 Papanui Road', suburb: 'Merivale', status: 'active', sequence: 2, coordinates: { lat: -43.518, lng: 172.625 } },
  { id: '3', address: '120 Blenheim Road', suburb: 'Upper Riccarton', status: 'pending', sequence: 3, coordinates: { lat: -43.545, lng: 172.595 } },
  { id: '4', address: '78 Main South Road', suburb: 'Sockburn', status: 'pending', sequence: 4, coordinates: { lat: -43.565, lng: 172.575 } },
  { id: '5', address: '234 Colombo Street', suburb: 'Sydenham', status: 'pending', sequence: 5, coordinates: { lat: -43.548, lng: 172.638 } },
];

const statusColorMap: Record<Stop['status'], string> = {
  delivered: 'statusDelivered',
  pending: 'statusPending',
  active: 'statusActive',
  failed: 'statusFailed',
  skipped: 'statusSkipped',
};

export default function MapScreen() {
  const { theme } = useTheme();
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [mapStyle, setMapStyle] = useState<'day' | 'night' | 'highContrast'>('day');

  const getStatusColor = (status: Stop['status']) => {
    return theme.colors[statusColorMap[status]] || theme.colors.textTertiary;
  };

  const handleNavigateToStop = (stop: Stop) => {
    console.log('Navigate to:', stop.address);
    // TODO: Connect to navigation module
  };

  const handleMarkDelivered = (stop: Stop) => {
    console.log('Mark delivered:', stop.address);
    setSelectedStop(null);
  };

  const handleSkipStop = (stop: Stop) => {
    console.log('Skip stop:', stop.address);
    setSelectedStop(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Map View Placeholder */}
      <View style={styles.mapContainer}>
        <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.mapBackground }]}>
          <Text style={[styles.mapPlaceholderText, { color: theme.colors.textTertiary }]}>
            🗺️ MapLibre GL Native View
          </Text>
          <Text style={[styles.mapPlaceholderSubtext, { color: theme.colors.textTertiary }]}>
            Offline PMTiles - Canterbury Region
          </Text>
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.statusDelivered }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Delivered</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.statusActive }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Current</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.statusPending }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.statusFailed }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Stop Pins Overlay (Simulated) */}
        <View style={styles.pinsOverlay}>
          {mockStops.map((stop) => (
            <TouchableOpacity
              key={stop.id}
              style={[
                styles.pin,
                { top: 100 + stop.sequence * 40, left: 50 + stop.sequence * 30 }
              ]}
              onPress={() => setSelectedStop(stop)}
            >
              <View style={[
                styles.pinDot,
                { backgroundColor: getStatusColor(stop.status), borderColor: theme.colors.background }
              ]} />
              <Text style={styles.pinLabel}>#{stop.sequence}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setMapStyle('day')}>
            <Text style={{ fontSize: 20 }}>☀️</Text>
            <Text style={styles.controlLabel}>Day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => setMapStyle('night')}>
            <Text style={{ fontSize: 20 }}>🌙</Text>
            <Text style={styles.controlLabel}>Night</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => setMapStyle('highContrast')}>
            <Text style={{ fontSize: 20 }}>🌓</Text>
            <Text style={styles.controlLabel}>High Contrast</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controlRow}>
          <Button variant="secondary" onPress={() => console.log('Locate me')}>
            📍 My Location
          </Button>
          {mockStops.find(s => s.status === 'active') && (
            <Button variant="primary" onPress={() => handleNavigateToStop(mockStops.find(s => s.status === 'active')!)}>
              ➡️ Next Stop
            </Button>
          )}
        </View>
      </View>

      {/* Stop Detail Modal */}
      <Modal visible={!!selectedStop} animationType="slide" transparent={true} onRequestClose={() => setSelectedStop(null)}>
        <View style={styles.modalOverlay} onTouchStart={() => setSelectedStop(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            {selectedStop && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[
                    styles.modalStatusBadge,
                    { backgroundColor: getStatusColor(selectedStop.status) }
                  ]} />
                  <Text style={[styles.modalStopNumber, { color: theme.colors.textPrimary }]}>Stop #{selectedStop.sequence}</Text>
                </View>
                <View style={styles.modalBody}>
                  <Text style={[styles.modalAddress, { color: theme.colors.textPrimary }]}>{selectedStop.address}</Text>
                  <Text style={[styles.modalSuburb, { color: theme.colors.textSecondary }]}>{selectedStop.suburb}</Text>
                  <View style={styles.modalCoordinates}>
                    <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>Coordinates:</Text>
                    <Text style={[styles.modalCoordValue, { color: theme.colors.textSecondary }]}>
                      {selectedStop.coordinates.lat.toFixed(6)}, {selectedStop.coordinates.lng.toFixed(6)}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <Button
                    variant={selectedStop.status === 'delivered' ? 'outline' : 'primary'}
                    onPress={() => handleMarkDelivered(selectedStop)}
                    disabled={selectedStop.status === 'delivered'}
                    style={styles.modalActionButton}
                  >
                    {selectedStop.status === 'delivered' ? '✅ Delivered' : '✅ Mark Delivered'}
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => handleSkipStop(selectedStop)}
                    style={styles.modalActionButton}
                  >
                    ⏭️ Skip
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => console.log('Navigate to', selectedStop.address)}
                    style={styles.modalActionButton}
                  >
                    🧭 Navigate
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  mapPlaceholderSubtext: { fontSize: 14, marginBottom: 24 },
  mapLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, fontWeight: '500' },
  pinsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  pin: { position: 'absolute', pointerEvents: 'auto', alignItems: 'center' },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinLabel: { fontSize: 10, fontWeight: '700', color: '#fff', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginTop: 2 },
  bottomControls: { padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  controlRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  controlButton: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  controlLabel: { fontSize: 12, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#9ca3af', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginBottom: 16 },
  modalStatusBadge: { width: 12, height: 12, borderRadius: 6 },
  modalStopNumber: { fontSize: 18, fontWeight: '600' },
  modalBody: { paddingHorizontal: 24, marginBottom: 24 },
  modalAddress: { fontSize: 20, fontWeight: '500', marginBottom: 4 },
  modalSuburb: { fontSize: 16, marginBottom: 12 },
  modalCoordinates: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  modalCoordLabel: { fontSize: 13, fontWeight: '500' },
  modalCoordValue: { fontSize: 13, fontFamily: 'monospace' },
  modalActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 24 },
  modalActionButton: { flex: 1 },
});