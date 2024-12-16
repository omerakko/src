// Initialize XR8
XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(), // Enable AR rendering
    XR8.XrController.pipelineModule(),      // Track AR camera
]);

const onxrloaded = () => {
    // Start XR session
    XR8.run({
        canvas: document.getElementById('camerafeed'), // Display camera feed
        imageTargets: [
            {
                name: "painting",
                image: "https://your-image-url/test.jpeg", // Public URL to your painting
                physicalWidth: 0.3, // Real-world width of the image (in meters)
            },
        ],
        placement: (args) => {
            const scene = XR8.Threejs.xrScene();
            const loader = new THREE.TextureLoader();

            // Load and display painting as a plane
            loader.load("https://your-image-url/test.jpeg", (texture) => {
                const material = new THREE.MeshBasicMaterial({ map: texture });
                const geometry = new THREE.PlaneGeometry(0.3, 0.2); // Match image aspect ratio
                const mesh = new THREE.Mesh(geometry, material);

                // Position the painting in AR
                mesh.position.copy(args.position);
                mesh.quaternion.copy(args.rotation);

                scene.add(mesh);
            });
        },
    });
};

window.onload = () => {
    XRExtras.Loading.showLoading({ onxrloaded });
};