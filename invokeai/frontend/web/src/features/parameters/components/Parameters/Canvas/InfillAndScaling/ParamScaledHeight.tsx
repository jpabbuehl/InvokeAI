import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { stateSelector } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import IAISlider from 'common/components/IAISlider';
import { roundToMultiple } from 'common/util/roundDownToMultiple';
import { setScaledBoundingBoxDimensions } from 'features/canvas/store/canvasSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const selector = createMemoizedSelector(
  [stateSelector],
  ({ generation, canvas }) => {
    const { scaledBoundingBoxDimensions, boundingBoxScaleMethod } = canvas;
    const { model, aspectRatio } = generation;

    return {
      model,
      scaledBoundingBoxDimensions,
      isManual: boundingBoxScaleMethod === 'manual',
      aspectRatio,
    };
  }
);

const ParamScaledHeight = () => {
  const dispatch = useAppDispatch();
  const { model, isManual, scaledBoundingBoxDimensions, aspectRatio } =
    useAppSelector(selector);

  const initial = ['sdxl', 'sdxl-refiner'].includes(model?.base_model as string)
    ? 1024
    : 512;

  const { t } = useTranslation();

  const handleChangeScaledHeight = useCallback(
    (v: number) => {
      let newWidth = scaledBoundingBoxDimensions.width;
      const newHeight = Math.floor(v);

      if (aspectRatio) {
        newWidth = roundToMultiple(newHeight * aspectRatio, 64);
      }

      dispatch(
        setScaledBoundingBoxDimensions({
          width: newWidth,
          height: newHeight,
        })
      );
    },
    [aspectRatio, dispatch, scaledBoundingBoxDimensions.width]
  );

  const handleResetScaledHeight = useCallback(() => {
    let resetWidth = scaledBoundingBoxDimensions.width;
    const resetHeight = Math.floor(initial);

    if (aspectRatio) {
      resetWidth = roundToMultiple(resetHeight * aspectRatio, 64);
    }

    dispatch(
      setScaledBoundingBoxDimensions({
        width: resetWidth,
        height: resetHeight,
      })
    );
  }, [aspectRatio, dispatch, initial, scaledBoundingBoxDimensions.width]);

  return (
    <IAISlider
      isDisabled={!isManual}
      label={t('parameters.scaledHeight')}
      min={64}
      max={1536}
      step={64}
      value={scaledBoundingBoxDimensions.height}
      onChange={handleChangeScaledHeight}
      sliderNumberInputProps={{ max: 4096 }}
      withSliderMarks
      withInput
      withReset
      handleReset={handleResetScaledHeight}
    />
  );
};

export default memo(ParamScaledHeight);
