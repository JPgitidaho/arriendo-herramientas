import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { api, UnitRow } from "../../lib/api";

export default function ModelDetail() {
  const { modelCode } = useLocalSearchParams<{ modelCode: string }>();
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [user, setUser] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getUnitsByModel(String(modelCode));
      setUnits(data.units || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [modelCode]);

  const counts = useMemo(() => {
    const available = units.filter((u) => u.status === "DISPONIBLE").length;
    const rented = units.filter((u) => u.status === "ARRENDADA").length;
    return { total: units.length, available, rented };
  }, [units]);

  async function out(identifier: string) {
    try {
      await api.outUnit({ identifier, user, note });
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    }
  }

  async function inUnit(identifier: string) {
    try {
      await api.inUnit({ identifier, user, note });
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: String(modelCode) }} />

      <Text style={{ fontSize: 18, fontWeight: "700" }}>{modelCode}</Text>
      <Text>Total: {counts.total} | Disp: {counts.available} | Arr: {counts.rented}</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={user}
          onChangeText={setUser}
          placeholder="User (opcional)"
          style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 }}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (opcional)"
          style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 }}
        />
      </View>

      {loading ? <ActivityIndicator /> : null}

      <FlatList
        data={units}
        keyExtractor={(i) => i.identifier}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 6 }}>
            <Text style={{ fontWeight: "700" }}>
              {item.identifier} · {item.series}
            </Text>
            <Text>Status: {item.status}</Text>
            <Text>Weekly: {item.weeklyOutCount ?? 0} | Total: {item.outCountTotal ?? 0}</Text>

            {item.status === "DISPONIBLE" ? (
              <Pressable onPress={() => out(item.identifier)} style={{ padding: 10, borderRadius: 10, borderWidth: 1 }}>
                <Text>OUT</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => inUnit(item.identifier)} style={{ padding: 10, borderRadius: 10, borderWidth: 1 }}>
                <Text>IN</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}
