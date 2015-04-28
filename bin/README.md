The `node` binary in this project was generated using the sources found in the
following GitHub project:

https://github.com/feichh/node.git

Building this project is required to compile the binary module `pswalk.node`
that is used in the project.

To compile node-android
=======================

The [Android NDK](https://developer.android.com/tools/sdk/ndk/index.html) is
required to build the Android node.js binary. With the NDK extracted, invoke the
`android-configure` script located in the node-android source
the following way:

> $ source android-configure ../path/to/Android/NDK

After a few seconds, your shell environment should be ready to build the
source using the NDK:

> $ make

Once the node-android project is built, you can copy the `node` binary and
it will be used by the Grunt file for distribution.

To compile the binary node module
=================================

The following command should compile the pswalk.node file.

> $ node-gyp --arch=arm --nodedir=../path/to/src/node-android clean configure build

Where `../path/to/src/node-android` should be replaced by the path where the
node-android project was extracted.
