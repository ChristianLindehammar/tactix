import React from 'react';
import renderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

import { OptionMenuModal } from '../OptionMenuModal';

describe('OptionMenuModal', () => {
  const baseProps = {
    visible: true,
    position: { top: 100, left: 100 },
  } as const;

  it('calls onClose when tapping outside (overlay press)', () => {
    const onClose = jest.fn();
    const onRename = jest.fn();
    const onDelete = jest.fn();

    const tree = renderer.create(
      <OptionMenuModal
        visible={baseProps.visible}
        position={baseProps.position}
        onClose={onClose}
        onRename={onRename}
        onDelete={onDelete}
      />
    );

    const touchables = tree.root.findAllByType(TouchableOpacity);
    // First TouchableOpacity is the full-screen overlay
    touchables[0].props.onPress();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRename).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onRename and then onClose when Rename is pressed', () => {
    const onClose = jest.fn();
    const onRename = jest.fn();
    const onDelete = jest.fn();

    const tree = renderer.create(
      <OptionMenuModal
        visible={baseProps.visible}
        position={baseProps.position}
        onClose={onClose}
        onRename={onRename}
        onDelete={onDelete}
      />
    );

    const touchables = tree.root.findAllByType(TouchableOpacity);
    // touchables[1] is the Rename menu item
    touchables[1].props.onPress();

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete and then onClose when Delete is pressed', () => {
    const onClose = jest.fn();
    const onRename = jest.fn();
    const onDelete = jest.fn();

    const tree = renderer.create(
      <OptionMenuModal
        visible={baseProps.visible}
        position={baseProps.position}
        onClose={onClose}
        onRename={onRename}
        onDelete={onDelete}
      />
    );

    const touchables = tree.root.findAllByType(TouchableOpacity);
    // touchables[2] is the Delete menu item
    touchables[2].props.onPress();

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRename).not.toHaveBeenCalled();
  });
});

