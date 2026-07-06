export default function CpuPage() {
  const playerModes = ["human", "human", "bot", "bot"];
  return <main>{playerModes.join(",")}</main>;
}
