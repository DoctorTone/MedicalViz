// General parameters for this app

const APPCONFIG = {
    ROOT_ROTATE: 0,
    CUBE_COLOUR : 0xfff000,
    CUBE_HEIGHT: 10,
    CUBE_WIDTH: 10,
    CUBE_DEPTH: 10,
    GROUND_WIDTH: 1800,
    GROUND_HEIGHT: 1000,
    GROUND_SEGMENTS: 16,
    GROUND_MATERIAL: 0xcbcbcb,
    RIGHT: 1,
    LEFT: 0,
    UP: 2,
    DOWN: 3,
    ZOOM_SPEED: 0.1,
    PLANE_SIZE: 250
}

// Line indices
const lineIndices0 = [];
lineIndices0.push(0, 1);
lineIndices0.push(1, 4);
lineIndices0.push(4, 7);
lineIndices0.push(1, 5);
lineIndices0.push(0, 2);
lineIndices0.push(2, 5);
lineIndices0.push(5, 7);
lineIndices0.push(2, 6);
lineIndices0.push(0, 3);
lineIndices0.push(3, 6);
lineIndices0.push(6, 7);
lineIndices0.push(3, 4);

const lineIndices1 = [];
lineIndices1.push(1, 4);
lineIndices1.push(4, 3);
lineIndices1.push(3, 6);
lineIndices1.push(4, 7);
lineIndices1.push(1, 5);
lineIndices1.push(5, 7);
lineIndices1.push(7, 6);
lineIndices1.push(5, 2);
lineIndices1.push(1, 0);
lineIndices1.push(0, 2);
lineIndices1.push(2, 6);
lineIndices1.push(0, 3);

const lineIndices3 = [];
lineIndices3.push(3, 0);
lineIndices3.push(0, 1);
lineIndices3.push(1, 5);
lineIndices3.push(0, 2);
lineIndices3.push(3, 6);
lineIndices3.push(6, 2);
lineIndices3.push(2, 5);
lineIndices3.push(6, 7);
lineIndices3.push(3, 4);
lineIndices3.push(4, 7);
lineIndices3.push(7, 5);
lineIndices3.push(4, 1);

const lineIndices4 = [];
lineIndices4.push(4, 3);
lineIndices4.push(3, 0);
lineIndices4.push(0, 2);
lineIndices4.push(3, 6);
lineIndices4.push(4, 7);
lineIndices4.push(7, 6);
lineIndices4.push(6, 2);
lineIndices4.push(7, 5);
lineIndices4.push(4, 1);
lineIndices4.push(1, 5);
lineIndices4.push(5, 2);
lineIndices4.push(1, 0);

export { APPCONFIG, lineIndices0, lineIndices1, lineIndices3, lineIndices4 };
