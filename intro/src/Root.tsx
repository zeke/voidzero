import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={MyComposition}
        durationInFrames={75}
        fps={25}
        width={1280}
        height={720}
      />
    </>
  );
};
