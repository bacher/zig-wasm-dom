const std = @import("std");

const number_of_pages = 1;
const max_number_of_pages = 2;

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const exe = b.addExecutable(.{
        .name = "zigdom",
        .root_source_file = b.path("src/zigdom.zig"),
        .target = target,
        .optimize = .ReleaseSmall,
    });

    // <https://github.com/ziglang/zig/issues/8633>
    exe.global_base = 0;
    exe.entry = .disabled;
    exe.rdynamic = true;
    // exe.import_memory = true;
    exe.stack_size = std.wasm.page_size / 2;

    exe.initial_memory = std.wasm.page_size * number_of_pages;
    exe.max_memory = std.wasm.page_size * max_number_of_pages;

    b.installArtifact(exe);
}
