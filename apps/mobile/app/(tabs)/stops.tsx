import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Modal } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

interface Stop {
  id: string;
  address: string;
  suburb: string;
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';
  sequence: number;
  coordinates: { lat: number; lng: number };
  deliveredAt?: string;
  failedReason?: string;
}

const mockStops: Stop[] = [
  { id: '1', address: '2/14 Riccarton Road', suburb: 'Riccarton', status: 'delivered', sequence: 1, coordinates: { lat: -43.535, lng: 172.605 }, deliveredAt: '08:32' },
  { id: '2', address: '45 Papanui Road', suburb: 'Merivale', status: 'active', sequence: 2, coordinates: { lat: -43.518, lng: 172.625 } },
  { id: '3', address: '120 Blenheim Road', suburb: 'Upper Riccarton', status: 'pending', sequence: 3, coordinates: { lat: -43.545, lng: 172.595 } },
  { id: '4', address: '78 Main South Road', suburb: 'Sockburn', status: 'pending', sequence: 4, coordinates: { lat: -43.565, lng: 172.575 } },
  { id: '5', address: '234 Colombo Street', suburb: 'Sydenham', status: 'pending', sequence: 5, coordinates: { lat: -43.548, lng: 172.638 } },
  { id: '6', address: '56 Ferry Road', suburb: 'Woolston', status: 'failed', sequence: 6, coordinates: { lat: -43.558, lng: 172.688 }, failedReason: 'No safe access' },
  { id: '7', address: '89 Hills Road', suburb: 'Cashmere', status: 'skipped', sequence: 7, coordinates: { lat: -43.578, lng: 172.608 } },
];

const statusColorMap: Record<Stop['status'], string> = {
  delivered: 'statusDelivered',
  pending: 'statusPending',
  active: 'statusActive',
  failed: 'statusFailed',
  skipped: 'statusSkipped',
};

const statusLabels: Record<Stop['status'], string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  active: 'Active',
  failed: 'Failed',
  skipped: 'Skipped',
};

export default function StopsScreen() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered' | 'failed' | 'skipped'>('all');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const filteredStops = filter === 'all' ? mockStops : mockStops.filter(s => s.status === filter);

  const getStatusColor = (status: Stop['status']) => {
    return theme.colors[statusColorMap[status]] || theme.colors.textTertiary;
  };

  const renderItem = ({ item }: { item: Stop }) => (
    <TouchableOpacity
      style={styles.stopItem}
      testID={`stop-${item.id}`}
      onPress={() => setSelectedStop(item)}
    >
      <View style={[
        styles.stopStatusDot,
        { backgroundColor: getStatusColor(item.status) }
      ]} />
      <View style={styles.stopNumberContainer}>
        <Text style={[styles.stopNumber, { color: theme.colors.textInverse, backgroundColor: getStatusColor(item.status) }]}>
          #{item.sequence}
        </Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={[styles.stopAddress, { color: theme.colors.textPrimary }]}>{item.address}</Text>
        <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary }]}>{item.suburb}</Text>
      </View>
      <View style={styles.stopRight}>
        <Badge variant={item.status === 'delivered' ? 'success' : item.status === 'active' ? 'active' : item.status === 'failed' ? 'error' : item.status === 'skipped' ? 'warning' : 'default'}>
  {statusLabels[item.status]}
</Badge>
        {item.deliveredAt && <Text style={[styles.deliveredTime, { color: theme.colors.textTertiary }]}>{item.deliveredAt}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView testID="stops-screen" style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>All Stops</Text>
        <Text style={[styles.count, { color: theme.colors.textSecondary }]}>{filteredStops.length} stops</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'pending', 'active', 'delivered', 'failed', 'skipped'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && { backgroundColor: theme.colors.brandPrimary },
              { borderColor: theme.colors.border }
            ]}
            onPress={() => setFilter(f as typeof filter)}
          >
            <Text style={[
              styles.filterTabText,
              { color: filter === f ? theme.colors.textInverse : theme.colors.textSecondary }
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredStops}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>No stops found</Text>
          </View>
        }
      />

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
                  <Badge variant={selectedStop.status === 'delivered' ? 'success' : selectedStop.status === 'active' ? 'active' : selectedStop.status === 'failed' ? 'error' : selectedStop.status === 'skipped' ? 'warning' : 'default'}>
  {statusLabels[selectedStop.status]}
</Badge>
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
                  {selectedStop.deliveredAt && (
                    <View style={styles.modalCoordinates}>
                      <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>Delivered at:</Text>
                      <Text style={[styles.modalCoordValue, { color: theme.colors.success }]}>{selectedStop.deliveredAt}</Text>
                    </View>
                  )}
                  {selectedStop.failedReason && (
                    <View style={styles.modalCoordinates}>
                      <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>Failed reason:</Text>
                      <Text style={[styles.modalCoordValue, { color: theme.colors.error }]}>{selectedStop.failedReason}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.modalActions}>
                  <Button
                    variant={selectedStop.status === 'delivered' ? 'outline' : 'primary'}
                    onPress={() => { console.log('Mark delivered', selectedStop.id); setSelectedStop(null); }}
                    disabled={selectedStop.status === 'delivered'}
                    style={styles.modalActionButton}
                  >
                    {selectedStop.status === 'delivered' ? '✅ Delivered' : '✅ Mark Delivered'}
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => { console.log('Skip', selectedStop.id); setSelectedStop(null); }}
                    style={styles.modalActionButton}
                  >
                    ⏭️ Skip
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => { console.log('Navigate', selectedStop.id); setSelectedStop(null); }}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: '700' },
  count: { fontSize: 14, fontWeight: '500' },
  filterTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterTabText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100, gap: 8 },
  stopItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  stopStatusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  stopNumberContainer: { flexShrink: 0 },
  stopNumber: { fontSize: 14, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, minWidth: 36, textAlign: 'center' },
  stopInfo: { flex: 1, minWidth: 0 },
  stopAddress: { fontSize: 16, fontWeight: '500' },
  stopSuburb: { fontSize: 14 },
  stopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliveredTime: { fontSize: 12, fontWeight: '500', fontFamily: 'monospace' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '85%' },
  modalHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#9ca3af', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginBottom: 16, flexWrap: 'wrap' },
  modalStatusBadge: { width: 12, height: 12, borderRadius: 6 },
  modalStopNumber: { fontSize: 18, fontWeight: '600' },
  modalBody: { paddingHorizontal: 24, marginBottom: 24 },
  modalAddress: { fontSize: 20, fontWeight: '500', marginBottom: 4 },
  modalSuburb: { fontSize: 16, marginBottom: 12 },
  modalCoordinates: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  modalCoordLabel: { fontSize: 13, fontWeight: '500' },
  modalCoordValue: { fontSize: 13, fontFamily: 'monospace' },
  modalActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 24 },
  modalActionButton: { flex: 1 },
});