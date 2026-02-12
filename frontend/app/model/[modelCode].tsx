import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { api, ModelUnitsResponse, UnitRow } from "../../lib/api";

export default function ModelDetail() {
  const { modelCode } = useLocalSearchParams<{ modelCode: string }>();
  const [data, setData] = useState<ModelUnitsResponse | null>(null);
  const [user, setUser] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await api.getUnitsByModel(String(modelCode));
      setData(d);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [modelCode]);

  const units = data?.units || [];
  const suggested = data?.suggested || null;

  const counts = useMemo(() => {
    const available = units.filter((u) => u.status === "DISPONIBLE").length;
    const rented = units.filter((u) => u.status === "ARRENDADA").length;
    return { total: units.length, available, rented };
  }, [units]);

  async function out(identifier: string) {
    try {
      await api.outUnit({ identifier, user, note });
      Alert.alert("OK", "OUT registrado");
      await load();
    } catch (e: any) {
      const alts = e.data?.alternatives?.map((a: any) => a.identifier).slice(0, 6).join(", ");
      if (e.status === 409) {
        Alert.alert("No se puede", `${e.message}${alts ? `\nAlternativas: ${alts}` : ""}`);
        return;
      }
      Alert.alert("Error", e.message || "Error");
    }
  }

  async function inUnit(identifier: string) {
    try {
      await api.inUnit({ identifier, user, note });
      Alert.alert("OK", "IN registrado");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    }
  }

  const title = data?.model?.toolName ? `${data.model.toolName} (${data.model.modelCode})` : String(modelCode);
  const suggestedLabel = suggested
    ? `${data?.model?.toolName ? `${data.model.toolName} · ` : ""}${suggested.identifier}`
    : "—";

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: String(modelCode) }} />

      <Text style={{ fontSize: 18, fontWeight: "700" }}>{title}</Text>
      {data?.model?.brand ? <Text>Marca: {data.model.brand}</Text> : null}
      <Text>Total: {counts.total} | Disp: {counts.available} | Arr: {counts.rented}</Text>

      <Text>Sugerida (rotación): {suggestedLabel}</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
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

      <Pressable
        onPress={() => (suggested ? out(suggested.identifier) : null)}
        disabled={!suggested}
        style={{ padding: 12, borderRadius: 10, borderWidth: 1, opacity: suggested ? 1 : 0.5 }}
      >
        <Text style={{ textAlign: "center" }}>OUT sugerida</Text>
      </Pressable>

      {loading ? <ActivityIndicator /> : null}

      <FlatList
        data={units}
        keyExtractor={(i) => i.identifier}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => <UnitCard item={item} toolName={data?.model?.toolName || ""} onOut={out} onIn={inUnit} />}
      />
    </View>
  );
}

function UnitCard({
  item,
  toolName,
  onOut,
  onIn,
}: {
  item: UnitRow;
  toolName: string;
  onOut: (id: string) => void;
  onIn: (id: string) => void;
}) {
  const idLabel = toolName ? `${toolName} · ${item.identifier}` : item.identifier;

  const hoy =
    item.usedToday || item.returnedToday
      ? `Hoy: ${item.usedToday ? "salió" : ""}${item.usedToday && item.returnedToday ? " y " : ""}${item.returnedToday ? "volvió" : ""}`
      : "Hoy: no";

  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 6 }}>
      <Text style={{ fontWeight: "700" }}>Serie: {item.series}</Text>
      <Text>{idLabel}</Text>
      <Text>Estado: {item.status}</Text>
      <Text>{hoy}</Text>
      <Text>Semana (actual): {item.weeklyOutCountCurrent ?? 0} | Total: {item.outCountTotal ?? 0}</Text>

      {item.status === "DISPONIBLE" ? (
        <Pressable onPress={() => onOut(item.identifier)} style={{ padding: 10, borderRadius: 10, borderWidth: 1 }}>
          <Text>OUT</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => onIn(item.identifier)} style={{ padding: 10, borderRadius: 10, borderWidth: 1 }}>
          <Text>IN</Text>
        </Pressable>
      )}
    </View>
  );
}
