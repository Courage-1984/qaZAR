import test from 'node:test';
import assert from 'node:assert/strict';
import {
  businessImpact, componentLabel, componentTitle, severityLabel,
} from '../report/componentGroup.js';

test('severityLabel maps engine severities to Critical/Warning/Needs review', () => {
  assert.equal(severityLabel('error'), 'Critical');
  assert.equal(severityLabel('warn'), 'Warning');
  assert.equal(severityLabel('info'), 'Needs review');
});

test('componentTitle groups navigation touch targets under one label', () => {
  assert.equal(componentLabel('nav > a.menu'), 'Main navigation');
  assert.match(componentTitle('target-size-minimum', 'nav > a'), /Main navigation/);
  assert.match(businessImpact('target-size-minimum'), /Lost mobile conversions/i);
});
