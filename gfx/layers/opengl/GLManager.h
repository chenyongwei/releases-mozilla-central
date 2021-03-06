/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_GLMANAGER_H
#define MOZILLA_GFX_GLMANAGER_H

#include "mozilla/gfx/Types.h"          // for SurfaceFormat
#include "LayerManagerOGLProgram.h"

namespace mozilla {
namespace gl {
class GLContext;
}

namespace layers {

class LayerManager;

/**
 * Minimal interface to allow widgets to draw using OpenGL. Abstracts
 * LayerManagerOGL and CompositorOGL. Call CreateGLManager with either a
 * LayerManagerOGL or a LayerManagerComposite backed by a CompositorOGL.
 */
class GLManager
{
public:
  static GLManager* CreateGLManager(LayerManager* aManager);

  virtual ~GLManager() {}

  virtual gl::GLContext* gl() const = 0;
  virtual ShaderProgramOGL* GetProgram(ShaderProgramType aType) = 0;
  virtual void BindAndDrawQuad(ShaderProgramOGL *aProg) = 0;

  ShaderProgramOGL* GetProgram(gfx::SurfaceFormat aFormat) {
    return GetProgram(ShaderProgramFromSurfaceFormat(aFormat));
  }
};

}
}
#endif
