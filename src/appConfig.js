// General parameters for this app

const APPCONFIG = {
    CUBE_COLOUR : 0xfff000,
    CUBE_HEIGHT: 10,
    CUBE_WIDTH: 10,
    CUBE_DEPTH: 10,
    CUBE_START_X: 0,
    CUBE_START_Y: -150,
    CUBE_START_Z: 0,
    GROUND_WIDTH: 1800,
    GROUND_HEIGHT: 1000,
    GROUND_SEGMENTS: 16,
    GROUND_MATERIAL: 0xcbcbcb,
    RIGHT: 1,
    LEFT: 0,
    UP: 2,
    DOWN: 3,
    ZOOM_SPEED: 0.1,
    PLANE_SIZE: 250,
    PLANE_START_X: 100,
    MOVE_SPEED: 10
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

const lineIndices2 = [];
lineIndices2.push(2, 6);
lineIndices2.push(6, 7);
lineIndices2.push(7, 4);
lineIndices2.push(6, 3);
lineIndices2.push(2, 0);
lineIndices2.push(0, 3);
lineIndices2.push(3, 4);
lineIndices2.push(0, 1);
lineIndices2.push(2, 5);
lineIndices2.push(5, 1);
lineIndices2.push(1, 4);
lineIndices2.push(5, 7);

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

const lineIndices5 = [];
lineIndices5.push(5, 2);
lineIndices5.push(2, 6);
lineIndices5.push(6, 3);
lineIndices5.push(2, 0);
lineIndices5.push(5, 1);
lineIndices5.push(1, 0);
lineIndices5.push(0, 3);
lineIndices5.push(1, 4);
lineIndices5.push(5, 7);
lineIndices5.push(7, 4);
lineIndices5.push(4, 3);
lineIndices5.push(7, 6);

const lineIndices6 = [];
lineIndices6.push(6, 7);
lineIndices6.push(7, 5);
lineIndices6.push(5, 1);
lineIndices6.push(7, 4);
lineIndices6.push(6, 3);
lineIndices6.push(3, 4);
lineIndices6.push(4, 1);
lineIndices6.push(3, 0);
lineIndices6.push(6, 2);
lineIndices6.push(2, 0);
lineIndices6.push(0, 1);
lineIndices6.push(2, 5);

const lineIndices7 = [];
lineIndices7.push(7, 5);
lineIndices7.push(5, 2);
lineIndices7.push(2, 0);
lineIndices7.push(5, 1);
lineIndices7.push(7, 4);
lineIndices7.push(4, 1);
lineIndices7.push(1, 0);
lineIndices7.push(4, 3);
lineIndices7.push(7, 6);
lineIndices7.push(6, 3);
lineIndices7.push(3, 0);
lineIndices7.push(6, 2);

export { APPCONFIG, lineIndices0, lineIndices1, lineIndices3, lineIndices4, lineIndices2, lineIndices5, lineIndices6, lineIndices7 };
