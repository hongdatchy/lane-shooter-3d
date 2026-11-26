"use client";

import React, { ReactNode, useEffect, useMemo, useRef } from "react";
import * as ReactDOM from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const tempObjPos = new THREE.Vector3();
const tempCamPos = new THREE.Vector3();
const tempCamDir = new THREE.Vector3();

function computeScreenPosition(
  el: THREE.Object3D,
  camera: THREE.Camera,
  width: number,
  height: number
): [number, number] {
  tempObjPos.setFromMatrixPosition(el.matrixWorld).project(camera);
  return [
    tempObjPos.x * (width * 0.5) + width * 0.5,
    -tempObjPos.y * (height * 0.5) + height * 0.5,
  ];
}

function computeDistanceScale(
  el: THREE.Object3D,
  camera: THREE.Camera,
  distanceFactor?: number
): number {
  if (distanceFactor === undefined) return 1;
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    return (camera as THREE.OrthographicCamera).zoom * distanceFactor;
  }
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const persp = camera as THREE.PerspectiveCamera;
    tempObjPos.setFromMatrixPosition(el.matrixWorld);
    tempCamPos.setFromMatrixPosition(camera.matrixWorld);
    const vFov = (persp.fov * Math.PI) / 180;
    const dist = tempObjPos.distanceTo(tempCamPos);
    const visibleHeight = 2 * Math.tan(vFov * 0.5) * Math.max(0.001, dist);
    return distanceFactor / visibleHeight;
  }
  return 1;
}

function computeZIndex(
  el: THREE.Object3D,
  camera: THREE.Camera,
  zIndexRange: [number, number]
): string {
  if (
    (camera as THREE.PerspectiveCamera).isPerspectiveCamera ||
    (camera as THREE.OrthographicCamera).isOrthographicCamera
  ) {
    const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    tempObjPos.setFromMatrixPosition(el.matrixWorld);
    tempCamPos.setFromMatrixPosition(camera.matrixWorld);
    const dist = tempObjPos.distanceTo(tempCamPos);
    const span = Math.max(0.001, cam.far - cam.near);
    const a = (zIndexRange[1] - zIndexRange[0]) / span;
    const b = zIndexRange[1] - a * cam.far;
    return `${Math.round(a * dist + b)}`;
  }
  return `${zIndexRange[0]}`;
}

export interface WorldHtmlProps {
  children: ReactNode;
  position?: [number, number, number];
  center?: boolean;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Thẻ DOM neo theo tọa độ 3D thay cho Html của @react-three/drei.
 * Trì hoãn unmount ReactDOM root ra ngoài chu kỳ commit của React 19 để tránh
 * cảnh báo "Attempted to synchronously unmount a root while React was already rendering".
 */
export function WorldHtml({
  children,
  position = [0, 0, 0],
  center = false,
  distanceFactor,
  zIndexRange = [16777271, 0],
  style,
  className,
}: WorldHtmlProps) {
  const { gl, camera, scene, size, events } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const hostElRef = useRef<HTMLDivElement | null>(null);
  const domRootRef = useRef<ReactDOM.Root | null>(null);
  const oldPosRef = useRef<[number, number]>([Number.NaN, Number.NaN]);
  const oldZoomRef = useRef(0);
  const visibleRef = useRef(true);

  const target = events.connected || (gl.domElement.parentNode as HTMLElement | null);

  const innerStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "absolute",
      transform: center ? "translate3d(-50%, -50%, 0)" : "none",
      ...style,
    }),
    [center, style]
  );

  // Tạo DOM container + React root trong passive effect và gỡ root bất đồng bộ khi unmount
  useEffect(() => {
    if (!target) return;

    const hostEl = document.createElement("div");
    hostEl.style.cssText =
      "position:absolute;top:0;left:0;transform-origin:0 0;display:none;";
    if (style?.pointerEvents) {
      hostEl.style.pointerEvents = String(style.pointerEvents);
    }

    target.appendChild(hostEl);
    const currentRoot = ReactDOM.createRoot(hostEl);
    hostElRef.current = hostEl;
    domRootRef.current = currentRoot;
    oldPosRef.current = [Number.NaN, Number.NaN];

    scene.updateMatrixWorld();

    return () => {
      hostElRef.current = null;
      domRootRef.current = null;
      hostEl.remove();
      window.setTimeout(() => {
        currentRoot.unmount();
      }, 0);
    };
  }, [target, scene, style?.pointerEvents]);

  // Render nội dung vào DOM root ngoài chu kỳ commit đồng bộ
  useEffect(() => {
    domRootRef.current?.render(
      <div style={innerStyle} className={className}>
        {children}
      </div>
    );
  }, [children, innerStyle, className]);

  useFrame(() => {
    const group = groupRef.current;
    const hostEl = hostElRef.current;
    if (!group || !hostEl || size.width <= 0 || size.height <= 0) return;

    camera.updateMatrixWorld();
    group.updateWorldMatrix(true, false);

    tempObjPos.setFromMatrixPosition(group.matrixWorld);
    tempCamPos.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(tempCamDir);
    const isBehind = tempObjPos.sub(tempCamPos).angleTo(tempCamDir) > Math.PI / 2;
    const nextVisible = !isBehind;

    if (visibleRef.current !== nextVisible || (nextVisible && hostEl.style.display === "none")) {
      visibleRef.current = nextVisible;
      hostEl.style.display = nextVisible ? "block" : "none";
    }
    if (!nextVisible) return;

    const [sx, sy] = computeScreenPosition(group, camera, size.width, size.height);
    if (
      Math.abs(oldZoomRef.current - camera.zoom) > 0.001 ||
      Math.abs(oldPosRef.current[0] - sx) > 0.25 ||
      Math.abs(oldPosRef.current[1] - sy) > 0.25 ||
      Number.isNaN(oldPosRef.current[0])
    ) {
      const scale = computeDistanceScale(group, camera, distanceFactor);
      hostEl.style.zIndex = computeZIndex(group, camera, zIndexRange);
      hostEl.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${scale})`;
      oldPosRef.current = [sx, sy];
      oldZoomRef.current = camera.zoom;
    }
  });

  return <group ref={groupRef} position={position} />;
}
