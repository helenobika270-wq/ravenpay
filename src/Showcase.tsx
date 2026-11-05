import { useLayoutEffect, useRef, useState } from 'react';
import './showcase.css';

/** A fixed-size live viewport, uniformly scaled with its hardware frame. */
export function Showcase() {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);
  useLayoutEffect(() => {
    const element = stage.current!;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      setScale(Math.min(1.1, (width - 64) / 414, (height - 64) / 868));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="showcase-stage" ref={stage}>
    <div className="showcase-device-slot" style={{ width: 414 * scale, height: 868 * scale }}>
      <div className="showcase-device" style={{ transform: `scale(${scale})` }}>
        <div className="device-button device-action" aria-hidden="true"/>
        <div className="device-button device-volume-up" aria-hidden="true"/>
        <div className="device-button device-volume-down" aria-hidden="true"/>
        <div className="device-button device-power" aria-hidden="true"/>
        <div className="device-antenna antenna-top" aria-hidden="true"/>
        <div className="device-antenna antenna-bottom" aria-hidden="true"/>
        <div className="showcase-screen">
          <iframe title="Interactive Raven Finance prototype" src="/?showcase=embedded" className="showcase-app"/>
          <div className="dynamic-island" aria-hidden="true"><span className="island-sensor"/><span className="island-camera"/></div>
        </div>
      </div>
    </div>
  </div>;
}
