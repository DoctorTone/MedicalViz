// General parameters to help with setting up scene

const SceneConfig = {
    clearColour: 0x5c5f64,
    ambientLightColour: 0x383838,
    pointLightColour: 0xffffff,
    LightPos: {
        x: 15,
        y: 25,
        z: 35
    },
    CameraPos: {
        x: 0,
        y: 150,
        z: 300
    },
    LookAtPos: {
        x: 0,
        y: 0,
        z: 0
    },
    NEAR_PLANE: 0.1,
    FAR_PLANE: 10000,
    FOV: 45
};

export { SceneConfig };