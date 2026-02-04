import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="model/[modelCode]" options={{ title: "Modelo" }} />
      <Stack.Screen name="modal" options={{ presentation: "modal", title: "Info" }} />
    </Stack>
  );
}
