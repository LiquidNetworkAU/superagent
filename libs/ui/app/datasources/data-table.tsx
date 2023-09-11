"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FilePicker } from "@apideck/file-picker-js"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useForm } from "react-hook-form"
import { RxCross2 } from "react-icons/rx"
import * as z from "zod"

import { Profile } from "@/types/profile"
import { Api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"

interface DataTableProps<TData, TValue> {
  columns: (profile: Profile) => ColumnDef<TData, TValue>[]
  data: TData[]
  profile: Profile
}

const formSchema = z.object({
  name: z.string().nonempty({
    message: "Name is required",
  }),
  description: z.string().nonempty({
    message: "Description is required",
  }),
  type: z.string(),
  url: z.string(),
  metadata: z.any(),
})

export function DataTable<TData, TValue>({
  columns,
  data,
  profile,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const { toast } = useToast()
  const api = new Api(profile.api_key)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [isLoadingFilePicker, setIsLoadingFilePicker] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [isDownloadingFile, setIsDownloadingFile] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<any | null>()
  const table = useReactTable({
    data,
    columns: columns(profile),
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  })
  const { ...form } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "PDF",
      metadata: null,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await api.createDatasource(values)
      toast({
        description: "Datasource created successfully",
      })
      router.refresh()
      setOpen(false)
      form.reset()
    } catch (error: any) {
      toast({
        description: error?.message,
      })
    }
  }

  const openVault = async () => {
    // Open Vault with a valid session token
    const response = await fetch("/datasources/apideck/", {
      method: "POST",
      body: JSON.stringify({ userId: profile.user_id }),
    })
    const { data } = await response.json()
    FilePicker.open({
      token: data.session_token,
      title: "Superagent",
      subTitle: "Select a file",
      onReady: () => {
        setIsLoadingFilePicker(false)
      },
      onSelect: async (file: any) => {
        setOpen(true)
        setSelectedFile(file)
        setIsDownloadingFile(true)
        const response = await fetch("/datasources/apideck/download", {
          method: "POST",
          body: JSON.stringify({
            fileId: file.id,
            userId: profile.user_id,
            mimeType: file.mime_type,
            fileName: file.name,
          }),
        })
        const { publicUrl } = await response.json()

        form.setValue("url", publicUrl)
        form.setValue("type", file.mime_type.split("/").pop().toUpperCase())
        setIsDownloadingFile(false)
      },
    })
  }

  return (
    <div>
      <div className="flex items-center space-x-4 py-4">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-md"
        />
        <Button
          size="sm"
          onClick={() => {
            setIsLoadingFilePicker(true)
            openVault()
          }}
        >
          {form.control._formState.isSubmitting ||
          isDownloadingFile ||
          isLoadingFilePicker ? (
            <Spinner />
          ) : (
            "New Datasource"
          )}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full space-y-6"
              >
                <DialogHeader>
                  <DialogTitle>Create new datasource</DialogTitle>
                  <DialogDescription>
                    Connect your to your custom datasources or files.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g My API" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Useful for doing X..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!selectedFile ? (
                    <div className="relative flex flex-col items-center justify-between space-y-4 rounded-lg border border-dashed p-4">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-sm">Connect to your accounts</p>
                        <p className="text-muted-foreground text-sm">
                          Google Drive, Dropbox, Box etc.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openVault()}
                        variant="secondary"
                      >
                        Select file
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-green-900 bg-green-900 bg-opacity-20 py-1 pl-4 pr-2">
                      <p className="text-sm">{selectedFile.name}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                      >
                        <RxCross2 size="20px" />
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" size="sm" className="w-full">
                    {form.control._formState.isSubmitting ||
                    isDownloadingFile ? (
                      <Spinner />
                    ) : (
                      "Create datasource"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No datasources found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Toaster />
    </div>
  )
}
