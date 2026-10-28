# Release builds run R8, which strips what is only reached by reflection.

# WorkManager builds its Room database through the generated class's no-arg constructor.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }

# Our workers, receivers and service are instantiated by class name (manifest, WorkManager).
-keep class expo.modules.smsreader.** { *; }
