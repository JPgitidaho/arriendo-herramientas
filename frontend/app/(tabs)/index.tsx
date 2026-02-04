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
    return rows.filter((r) => r.modelCode.toLowerCase().includes(t));
  }, [rows, q]);

  async function outSuggested(item: ModelRow) {
    if (!item.suggestedIdentifier) return;
    try {
      await api.outUnit({ identifier: item.suggestedIdentifier, user, note });
      await load();
    } catch (e: any) {
      if (e.status === 409) {
        Alert.alert("No disponible", "Entra al modelo para elegir alternativa.");
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
        placeholder="Buscar modelCode..."
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
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/model/${item.modelCode}`)}
            style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 6 }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.modelCode}</Text>
            <Text>
              Total: {item.stockTotal} | Disp: {item.disponibles} | Arr: {item.arrendadas}
            </Text>
            <Text>Sugerida: {item.suggestedIdentifier || "-"}</Text>

            <Pressable
              onPress={() => outSuggested(item)}
              disabled={!item.suggestedIdentifier}
              style={{
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                opacity: item.suggestedIdentifier ? 1 : 0.5,
                marginTop: 6,
              }}
            >
              <Text>OUT sugerida</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}
