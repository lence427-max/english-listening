export async function loadAndRenderView({ load, render, onError }) {
  try {
    const loaded = await load();
    render(loaded);
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}
