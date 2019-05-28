import {
  Tree,
  chain,
  SchematicsException,
  mergeWith,
  apply,
  url,
  filter,
  applyTemplates,
  move,
  noop,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { Schema as ComponentOptions, Style } from '@schematics/angular/component/schema';
import { findModuleFromOptions } from '@schematics/angular/utility/find-module';
import { getProject, buildDefaultPath } from '@schematics/angular/utility/project';
import { parseName } from '@schematics/angular/utility/parse-name';
import { validateHtmlSelector, validateName } from '@schematics/angular/utility/validation';
import { applyLintFix } from '@schematics/angular/utility/lint-fix';

import { buildSelector } from '../utils/buildSelector';
import { addDeclarationToNgModule } from '../utils/addDeclarationToNgModule';

export default function(options: ComponentOptions) {
  return (host: Tree) => {
    if (!options.project) {
      throw new SchematicsException('Option (project) is required.');
    }
    const project = getProject(host, options.project);

    if (options.path === undefined) {
      options.path = buildDefaultPath(project);
    }

    options.module = findModuleFromOptions(host, options);

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    options.selector = options.selector || buildSelector(options, project.prefix);

    // todo remove these when we remove the deprecations
    options.style =
      (options.style && options.style !== Style.Css ? options.style : (options.styleext as Style)) || Style.Css;
    options.skipTests = options.skipTests || !options.spec;

    validateName(options.name);
    validateHtmlSelector(options.selector);

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
      options.inlineStyle ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
      options.inlineTemplate ? filter((path) => !path.endsWith('.html.template')) : noop(),
      applyTemplates({
        ...strings,
        'if-flat': (s: string) => (options.flat ? '' : s),
        ...options,
      }),
      move(parsedPath.path),
    ]);

    return chain([
      addDeclarationToNgModule(options),
      mergeWith(templateSource),
      options.lintFix ? applyLintFix(options.path) : noop(),
    ]);
  };
}
