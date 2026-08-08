import VideoFrameEnhancer from "./video-frame-enhancer";

export default function ContentReadyLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <VideoFrameEnhancer />
  </>;
}
