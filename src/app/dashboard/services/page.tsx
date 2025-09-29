'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Service } from '@/lib/types/database'
import { getServices, createService, updateService, deleteService } from '@/lib/supabase/services'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'

const serviceSchema = z.object({
  name: z.string()
    .min(1, 'Service name is required')
    .min(2, 'Service name must be at least 2 characters')
    .max(50, 'Service name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s&'-]+$/, 'Service name can only contain letters, numbers, spaces, &, \', and -'),
  price: z.string()
    .min(1, 'Price range is required')
    .regex(/^R\d+(\.\d{2})?(-R\d+(\.\d{2})?)?$/, 'Price must be in format "R170" or "R170-R470"')
    .refine((val) => {
      // Validate that if it's a range, the first price is less than the second
      if (val.includes('-')) {
        const [minPrice, maxPrice] = val.split('-');
        const min = parseFloat(minPrice.replace('R', ''));
        const max = parseFloat(maxPrice.replace('R', ''));
        return min < max;
      }
      return true;
    }, 'Minimum price must be less than maximum price'),
})

type ServiceFormData = z.infer<typeof serviceSchema>

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      price: '',
    },
  })

  const fetchServices = async () => {
    try {
      setLoading(true)
      const data = await getServices()
      setServices(data)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to fetch services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const onSubmit = async (data: ServiceFormData) => {
    try {
      setSubmitting(true)
      
      // Additional validation
      if (!data.name.trim()) {
        toast.error('Service name cannot be empty')
        return
      }
      
      if (!data.price.trim()) {
        toast.error('Price range cannot be empty')
        return
      }
      
      // Validate price format
      const priceRegex = /^R\d+(\.\d{2})?(-R\d+(\.\d{2})?)?$/;
      if (!priceRegex.test(data.price)) {
        toast.error('Price must be in format "R170" or "R170-R470"')
        return
      }
      
      if (editingService) {
        await updateService(editingService.id, data)
        toast.success(`"${data.name}" updated successfully`)
      } else {
        await createService(data)
        toast.success(`"${data.name}" created successfully`)
      }
      
      setDialogOpen(false)
      setEditingService(null)
      form.reset()
      await fetchServices()
    } catch (error) {
      console.error('Error saving service:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to ${editingService ? 'update' : 'create'} service: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    form.reset({
      name: service.name,
      price: service.price, // Now a string, so no conversion needed
    })
    setDialogOpen(true)
  }

  const handleDelete = async (service: Service) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${service.name}"?\n\nThis action cannot be undone.`
    )
    
    if (!confirmed) {
      return
    }

    try {
      await deleteService(service.id)
      toast.success(`"${service.name}" deleted successfully`)
      await fetchServices()
    } catch (error) {
      console.error('Error deleting service:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to delete service: ${errorMessage}`)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingService(null)
    form.reset()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your laundry services and pricing
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingService(null)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] mx-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
                {editingService 
                  ? 'Update the service details below.'
                  : 'Add a new service type with pricing information.'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-gray-900 dark:text-white">
                        Service Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Wash & Fold" 
                          className="h-12 text-base bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-gray-900 dark:text-white">
                        Price Range
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="R170-R470 or R170"
                          className="h-12 text-base bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200"
                          {...field}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Enter price range like &quot;R170-R470&quot; or single price like &quot;R170&quot;
                      </div>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    disabled={submitting}
                    className="w-full sm:w-auto h-11 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Service List
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            All available laundry services and their current pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading services...</div>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No services found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first service.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                    <TableHead className="whitespace-nowrap font-semibold text-gray-900 dark:text-white">Service Name</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold text-gray-900 dark:text-white">Price</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell font-semibold text-gray-900 dark:text-white">Created</TableHead>
                    <TableHead className="text-right whitespace-nowrap font-semibold text-gray-900 dark:text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white font-medium">{service.name}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 sm:hidden mt-1">
                            Created: {new Date(service.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400 py-4">
                        {service.price}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-gray-600 dark:text-gray-400 py-4">
                        {new Date(service.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(service)}
                            className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                            title="Edit service"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(service)}
                            className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                            title="Delete service"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}