import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { stateSelector } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import IAINumberInput from 'common/components/IAINumberInput';
import IAISlider from 'common/components/IAISlider';
import { setRefinerSteps } from 'features/sdxl/store/sdxlSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsRefinerAvailable } from 'services/api/hooks/useIsRefinerAvailable';

const selector = createMemoizedSelector([stateSelector], ({ sdxl, ui }) => {
  const { refinerSteps } = sdxl;
  const { shouldUseSliders } = ui;

  return {
    refinerSteps,
    shouldUseSliders,
  };
});

const ParamSDXLRefinerSteps = () => {
  const { refinerSteps, shouldUseSliders } = useAppSelector(selector);
  const isRefinerAvailable = useIsRefinerAvailable();

  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (v: number) => {
      dispatch(setRefinerSteps(v));
    },
    [dispatch]
  );
  const handleReset = useCallback(() => {
    dispatch(setRefinerSteps(20));
  }, [dispatch]);

  return shouldUseSliders ? (
    <IAISlider
      label={t('sdxl.steps')}
      min={1}
      max={100}
      step={1}
      onChange={handleChange}
      handleReset={handleReset}
      value={refinerSteps}
      withInput
      withReset
      withSliderMarks
      sliderNumberInputProps={{ max: 500 }}
      isDisabled={!isRefinerAvailable}
    />
  ) : (
    <IAINumberInput
      label={t('sdxl.steps')}
      min={1}
      max={500}
      step={1}
      onChange={handleChange}
      value={refinerSteps}
      numberInputFieldProps={{ textAlign: 'center' }}
      isDisabled={!isRefinerAvailable}
    />
  );
};

export default memo(ParamSDXLRefinerSteps);
