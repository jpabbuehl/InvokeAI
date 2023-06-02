import { Flex } from '@chakra-ui/react';
import IAISlider from 'common/components/IAISlider';
import { ChangeEvent, memo, useCallback } from 'react';
import { useProcessorNodeChanged } from '../hooks/useProcessorNodeChanged';
import { RequiredLineartImageProcessorInvocation } from 'features/controlNet/store/types';
import IAISwitch from 'common/components/IAISwitch';

type LineartProcessorProps = {
  controlNetId: string;
  processorNode: RequiredLineartImageProcessorInvocation;
};

const LineartProcessor = (props: LineartProcessorProps) => {
  const { controlNetId, processorNode } = props;
  const { image_resolution, detect_resolution, coarse } = processorNode;
  const processorChanged = useProcessorNodeChanged();

  const handleDetectResolutionChanged = useCallback(
    (v: number) => {
      processorChanged(controlNetId, { detect_resolution: v });
    },
    [controlNetId, processorChanged]
  );

  const handleImageResolutionChanged = useCallback(
    (v: number) => {
      processorChanged(controlNetId, { image_resolution: v });
    },
    [controlNetId, processorChanged]
  );

  const handleCoarseChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      processorChanged(controlNetId, { coarse: e.target.checked });
    },
    [controlNetId, processorChanged]
  );

  return (
    <Flex sx={{ flexDirection: 'column', gap: 2 }}>
      <IAISlider
        label="Detect Resolution"
        value={detect_resolution}
        onChange={handleDetectResolutionChanged}
        min={0}
        max={4096}
        withInput
      />
      <IAISlider
        label="Image Resolution"
        value={image_resolution}
        onChange={handleImageResolutionChanged}
        min={0}
        max={4096}
        withInput
      />
      <IAISwitch
        label="Coarse"
        isChecked={coarse}
        onChange={handleCoarseChanged}
      />
    </Flex>
  );
};

export default memo(LineartProcessor);