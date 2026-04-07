let navmeshGridPromise = null;

export async function loadNavmeshGrid() {
  if (!navmeshGridPromise) {
    navmeshGridPromise = fetch('/data/navmesh/Map_Kiosk_NavMeshMovable.grid.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load navmesh grid JSON.');
        }

        return response.json();
      });
  }

  return navmeshGridPromise;
}
