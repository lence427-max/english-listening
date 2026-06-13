/**
 * Coordinates async work where only the latest request may update UI state.
 */
export function createLatestRequestCoordinator() {
  let version = 0;
  let controller = null;

  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      const requestVersion = ++version;

      return {
        signal: controller.signal,
        isCurrent: () => requestVersion === version,
      };
    },

    cancel() {
      version++;
      controller?.abort();
      controller = null;
    },
  };
}
