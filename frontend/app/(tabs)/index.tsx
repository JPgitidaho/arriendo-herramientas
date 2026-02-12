import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { api, ModelRow } from "../../lib/api";

export default function ModelsScreen() {
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [q, setQ] = useState("");
  const [user, setUser] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRows((await api.getModels()) || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => (r.toolName || "").toLowerCase().includes(t) || r.modelCode.includes(t));
  }, [rows, q]);

  async function outSuggested(item: ModelRow) {
    if (!item.suggestedIdentifier) return;
    try {
      await api.outUnit({ identifier: item.suggestedIdentifier, user, note });
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

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Modelos</Text>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar por nombre o modelCode..."
        style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
      />

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
        data={filtered}
        keyExtractor={(i) => i.modelCode}
        onRefresh={load}
        refreshing={loading}
        ListEmptyComponent={<Text>No hay modelos.</Text>}
        renderItem={({ item }) => {
          const title = item.toolName ? `${item.toolName} (${item.modelCode})` : item.modelCode;
          const suggestedLabel = item.suggestedIdentifier
            ? `${item.toolName ? `${item.toolName} · ` : ""}${item.suggestedIdentifier}`
            : "—";

          return (
            <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>{title}</Text>
              {item.brand ? <Text>Marca: {item.brand}</Text> : null}
              <Text>Total: {item.stockTotal} | Disp: {item.disponibles} | Arr: {item.arrendadas}</Text>
              <Text>Sugerida: {suggestedLabel}</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <Pressable
                  onPress={() => router.push(`/model/${item.modelCode}`)}
                  style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 }}
                >
                  <Text style={{ textAlign: "center" }}>Ver series</Text>
                </Pressable>

                <Pressable
                  onPress={() => outSuggested(item)}
                  disabled={!item.suggestedIdentifier}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    opacity: item.suggestedIdentifier ? 1 : 0.5,
                  }}
                >
                  <Text style={{ textAlign: "center" }}>OUT sugerida</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
