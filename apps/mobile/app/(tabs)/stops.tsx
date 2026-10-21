import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Modal, ScrollView, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors as tokenColors } from '@courier/design-tokens/tokens';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { DoorMemorySection } from '@/doorMemory/DoorMemorySection';
import { fontSize, radius, space, target } from '@/styles/tokens';

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
  const { height: windowHeight } = useWindowDimensions();
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered' | 'failed' | 'skipped'>('all');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const filteredStops = filter === 'all' ? mockStops : mockStops.filter(s => s.status === filter);

  const getStatusColor = (status: Stop['status']) => {
    return theme.colors[statusColorMap[status]] || theme.colors.textTertiary;
  };

  const renderItem = ({ item }: { item: Stop }) => (
    <TouchableOpacity
      style={[styles.stopItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      testID={`stop-${item.id}`}
      onPress={() => setSelectedStop(item)}
      accessibilityRole="button"
      accessibilityLabel={`Stop ${item.sequence}, ${item.address}`}
    >
      <View
        style={[
          styles.stopStatusDot,
          { backgroundColor: getStatusColor(item.status) },
        ]}
      />
      <View style={styles.stopNumberContainer}>
        <Text style={[styles.stopNumber, { color: theme.colors.textInverse, backgroundColor: getStatusColor(item.status), fontSize: fontSize.base }]}>
          #{item.sequence}
        </Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={[styles.stopAddress, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>{item.address}</Text>
        <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>{item.suburb}</Text>
      </View>
      <View style={styles.stopRight}>
        <Badge variant={item.status === 'delivered' ? 'success' : item.status === 'active' ? 'active' : item.status === 'failed' ? 'error' : item.status === 'skipped' ? 'warning' : 'default'}>
          {statusLabels[item.status]}
        </Badge>
        {item.deliveredAt && <Text style={[styles.deliveredTime, { color: theme.colors.textTertiary, fontSize: fontSize.sm }]}>{item.deliveredAt}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView testID="stops-screen" style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary, fontSize: fontSize.xxl }]}>All Stops</Text>
        <Text style={[styles.count, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>{filteredStops.length} stops</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'pending', 'active', 'delivered', 'failed', 'skipped'].map((f) => (
          <TouchableOpacity
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            style={[
              styles.filterTab,
              filter === f && { backgroundColor: theme.colors.brandPrimary },
              { borderColor: theme.colors.border },
            ]}
            onPress={() => setFilter(f as typeof filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === f ? theme.colors.textInverse : theme.colors.textSecondary, fontSize: fontSize.lg },
              ]}
            >
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
            <Text style={[styles.emptyText, { color: theme.colors.textTertiary, fontSize: fontSize.lg }]}>No stops found</Text>
          </View>
        }
      />

      {/* Stop Detail Modal */}
      <Modal visible={!!selectedStop} animationType="slide" transparent={true} onRequestClose={() => setSelectedStop(null)}>
        <View style={styles.modalOverlay} onTouchStart={() => setSelectedStop(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            {selectedStop && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: getStatusColor(selectedStop.status) },
                    ]}
                  />
                  <Text style={[styles.modalStopNumber, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>Stop #{selectedStop.sequence}</Text>
                  <Badge variant={selectedStop.status === 'delivered' ? 'success' : selectedStop.status === 'active' ? 'active' : selectedStop.status === 'failed' ? 'error' : selectedStop.status === 'skipped' ? 'warning' : 'default'}>
                    {statusLabels[selectedStop.status]}
                  </Badge>
                </View>
                <ScrollView
                  style={[styles.modalBody, { height: windowHeight * 0.45 }]}
                  contentContainerStyle={styles.modalBodyContent}
                >
                  <Text style={[styles.modalAddress, { color: theme.colors.textPrimary, fontSize: fontSize.xl }]}>{selectedStop.address}</Text>
                  <Text style={[styles.modalSuburb, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>{selectedStop.suburb}</Text>
                  <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary, fontSize: fontSize.lg }]}>Coordinates:</Text>
                    <Text style={[styles.modalCoordValue, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
                      {selectedStop.coordinates.lat.toFixed(6)}, {selectedStop.coordinates.lng.toFixed(6)}
                    </Text>
                  </View>
                  {selectedStop.deliveredAt && (
                    <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                      <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary, fontSize: fontSize.lg }]}>Delivered at:</Text>
                      <Text style={[styles.modalCoordValue, { color: theme.colors.success, fontSize: fontSize.lg }]}>{selectedStop.deliveredAt}</Text>
                    </View>
                  )}
                  {selectedStop.failedReason && (
                    <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                      <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary, fontSize: fontSize.lg }]}>Failed reason:</Text>
                      <Text style={[styles.modalCoordValue, { color: theme.colors.error, fontSize: fontSize.lg }]}>{selectedStop.failedReason}</Text>
                    </View>
                  )}

                  <DoorMemorySection stopId={selectedStop.id} />
                </ScrollView>
                <View style={styles.modalActions}>
                  <Button
                    variant={selectedStop.status === 'delivered' ? 'outline' : 'primary'}
                    onPress={() => { console.log('Mark delivered', selectedStop.id); setSelectedStop(null); }}
                    disabled={selectedStop.status === 'delivered'}
                    style={styles.modalActionButton}
                  >
                    Mark Delivered
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => { console.log('Skip', selectedStop.id); setSelectedStop(null); }}
                    style={styles.modalActionButton}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => { console.log('Navigate', selectedStop.id); setSelectedStop(null); }}
                    style={styles.modalActionButton}
                    leftIcon={<MaterialIcons name="navigation" size={18} color={theme.colors.textPrimary} />}
                  >
                    Navigate
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.lg, borderBottomWidth: 1 },
  title: { fontWeight: '700' },
  count: { fontWeight: '500' },
  filterTabs: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, overflow: 'hidden' },
  filterTab: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.full, borderWidth: 1, minHeight: target.min, justifyContent: 'center' },
  filterTabText: { fontWeight: '600' },
  listContent: { padding: space.lg, paddingBottom: space.huge, gap: space.sm },
  stopItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  stopStatusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  stopNumberContainer: { flexShrink: 0 },
  stopNumber: { fontWeight: '700', paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm, minWidth: 36, textAlign: 'center' },
  stopInfo: { flex: 1, minWidth: 0 },
  stopAddress: { fontWeight: '600' },
  stopSuburb: {},
  stopRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  deliveredTime: { fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  emptyText: { fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: tokenColors.background.overlay },
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: space.xl, maxHeight: '85%' },
  modalHandle: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginTop: space.md, marginBottom: space.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, marginBottom: space.lg, flexWrap: 'wrap' },
  modalStatusBadge: { width: 12, height: 12, borderRadius: 6 },
  modalStopNumber: { fontWeight: '600' },
  modalBody: {},
  modalBodyContent: { paddingHorizontal: space.xl, paddingBottom: space.lg },
  modalAddress: { fontWeight: '600', marginBottom: space.xs },
  modalSuburb: { marginBottom: space.md },
  modalCoordinates: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1 },
  modalCoordLabel: { fontWeight: '600' },
  modalCoordValue: { fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl },
  modalActionButton: { flex: 1 },
});
